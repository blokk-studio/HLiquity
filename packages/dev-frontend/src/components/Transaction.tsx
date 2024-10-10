import React, { useState, useContext, useEffect, useCallback } from "react";

import "react-circular-progressbar/dist/styles.css";

import {
  EthersTransactionOverrides,
  EthersTransactionFailedError as EthersTransactionCancelledError
} from "@liquity/lib-ethers";
import { SentLiquityTransaction } from "@liquity/lib-base";

import { useLiquity } from "../hooks/LiquityContext";

import { Tooltip } from "./Tooltip";
import type { TooltipProps } from "./Tooltip";

import { TransactionStatus } from "./TransactionStatus";
import { useSnackbar } from "./Snackbar";
import { getNoMatchingKeyErrorSnack, isNoMatchingKeyError } from "../errors";

type TransactionIdle = {
  type: "idle";
};

type TransactionFailed = {
  type: "failed";
  id: string;
  error: Error;
};

type TransactionWaitingForApproval = {
  type: "waitingForApproval";
  id: string;
};

type TransactionCancelled = {
  type: "cancelled";
  id: string;
};

type TransactionWaitingForConfirmations = {
  type: "waitingForConfirmation";
  id: string;
  tx: SentLiquityTransaction;
};

type TransactionConfirmed = {
  type: "confirmed";
  id: string;
};

type TransactionConfirmedOneShot = {
  type: "confirmedOneShot";
  id: string;
};

export type TransactionState =
  | TransactionIdle
  | TransactionFailed
  | TransactionWaitingForApproval
  | TransactionCancelled
  | TransactionWaitingForConfirmations
  | TransactionConfirmed
  | TransactionConfirmedOneShot;

const TransactionContext = React.createContext<
  [TransactionState, (state: TransactionState) => void] | undefined
>(undefined);

export const TransactionProvider: React.FC = ({ children }) => {
  const transactionState = useState<TransactionState>({ type: "idle" });
  return (
    <TransactionContext.Provider value={transactionState}>{children}</TransactionContext.Provider>
  );
};

/** useTransactionState, but that name causes eslint to misunderstand this hooks as a different one */
const useTxState = () => {
  const transactionState = useContext(TransactionContext);

  if (!transactionState) {
    throw new Error("You must provide a TransactionContext via TransactionProvider");
  }

  return transactionState;
};

export const useMyTransactionState = (myId: string | RegExp): TransactionState => {
  const [transactionState] = useTxState();

  return transactionState.type !== "idle" &&
    (typeof myId === "string" ? transactionState.id === myId : transactionState.id.match(myId))
    ? transactionState
    : { type: "idle" };
};

const hasMessage = (error: unknown): error is { message: string } =>
  typeof error === "object" &&
  error !== null &&
  "message" in error &&
  typeof (error as { message: unknown }).message === "string";

type ButtonlikeProps = {
  disabled?: boolean;
  variant?: string;
  onClick?: () => void;
};

export type TransactionFunction = (
  overrides?: EthersTransactionOverrides
) => Promise<SentLiquityTransaction>;

type TransactionProps<C> = {
  id: string;
  tooltip?: string;
  tooltipPlacement?: TooltipProps["placement"];
  showFailure?: "asTooltip" | "asChildText";
  requires?: readonly (readonly [boolean, string])[];
  send: TransactionFunction;
  children: C;
};

/** useTransactionFunction, but that name causes eslint to misunderstand this hooks as a different one */
export const useTxFunction = (
  id: string,
  send: TransactionFunction
): [sendTransaction: () => Promise<void>, transactionState: TransactionState] => {
  const [transactionState, setTransactionState] = useTxState();
  const { store } = useLiquity();
  const snackbar = useSnackbar();

  const sendTransaction = useCallback(async () => {
    setTransactionState({ type: "waitingForApproval", id });

    try {
      const tx = await send();

      setTransactionState({
        type: "waitingForConfirmation",
        id,
        tx
      });
    } catch (throwable) {
      if (hasMessage(throwable) && throwable.message.includes("User denied transaction signature")) {
        setTransactionState({ type: "cancelled", id });
      } else {
        if (isNoMatchingKeyError(throwable)) {
          snackbar.addSnack(getNoMatchingKeyErrorSnack());
        }

        setTransactionState({
          type: "failed",
          id,
          error: new Error("Failed to send transaction (try again)")
        });
      }
    }

    store.refresh();
  }, [send, id, setTransactionState, snackbar, store]);

  return [sendTransaction, transactionState];
};

export function Transaction<C extends React.ReactElement<ButtonlikeProps>>({
  id,
  tooltip,
  tooltipPlacement,
  showFailure,
  requires,
  send,
  children
}: TransactionProps<C>) {
  const [sendTransaction, transactionState] = useTxFunction(id, send);
  const trigger = React.Children.only<C>(children);

  const failureReasons = (requires || [])
    .filter(([requirement]) => !requirement)
    .map(([, reason]) => reason);

  if (
    transactionState.type === "waitingForApproval" ||
    transactionState.type === "waitingForConfirmation"
  ) {
    failureReasons.push("You must wait for confirmation");
  }

  showFailure =
    failureReasons.length > 0 ? showFailure ?? (tooltip ? "asTooltip" : "asChildText") : undefined;

  const clonedTrigger =
    showFailure === "asChildText"
      ? React.cloneElement(
          trigger,
          {
            disabled: true,
            variant: "danger"
          },
          failureReasons[0]
        )
      : showFailure === "asTooltip"
      ? React.cloneElement(trigger, { disabled: true })
      : React.cloneElement(trigger, { onClick: sendTransaction });

  if (showFailure === "asTooltip") {
    tooltip = failureReasons[0];
  }

  return tooltip ? (
    <>
      <Tooltip message={tooltip} placement={tooltipPlacement || "right"}>
        {clonedTrigger}
      </Tooltip>
    </>
  ) : (
    clonedTrigger
  );
}

export const TransactionMonitor: React.FC = () => {
  const { store } = useLiquity();
  const [transactionState, setTransactionState] = useTxState();

  const id = transactionState.type !== "idle" ? transactionState.id : undefined;
  const tx = transactionState.type === "waitingForConfirmation" ? transactionState.tx : undefined;

  useEffect(() => {
    if (id && tx) {
      let cancelled = false;
      let finished = false;

      // TODO: fix shitty interface design if necessary and add the hash to the type rathen than relying on rawX
      // const txHash = tx.rawSentTransaction.hash;
      const txHash = "<no hash on non-ethers liquity implementations>";

      const waitForConfirmation = async () => {
        try {
          const receipt = await tx.waitForReceipt();

          if (cancelled) {
            return;
          }

          // TODO: fix shitty interface design if necessary and add the hash to the type rathen than relying on rawX
          // const { confirmations } = receipt.rawReceipt;
          // const blockNumber = receipt.rawReceipt.blockNumber + confirmations - 1;
          const confirmations = 0;
          const blockNumber = 0;
          console.log(`Block #${blockNumber} ${confirmations}-confirms tx ${txHash}`);
          console.log(`Finish monitoring tx ${txHash}`);
          finished = true;

          if (receipt.status === "succeeded") {
            setTransactionState({
              type: "confirmedOneShot",
              id
            });
          } else {
            // TODO: fix shitty interface design if necessary and add the hash to the type rathen than relying on rawX
            // const reason = await tryToGetRevertReason(provider, receipt.rawReceipt);
            const reason = "<no revert reason on non-ethers liquity implementations>";

            if (cancelled) {
              return;
            }

            console.error(`Tx ${txHash} failed`);
            if (reason) {
              console.error(`Revert reason: ${reason}`);
            }

            setTransactionState({
              type: "failed",
              id,
              error: new Error(reason ? `Reverted: ${reason}` : "Failed")
            });
          }
        } catch (rawError) {
          if (cancelled) {
            return;
          }

          finished = true;

          if (rawError instanceof EthersTransactionCancelledError) {
            console.log(`Cancelled tx ${txHash}`);
            setTransactionState({ type: "cancelled", id });
          } else {
            console.error(`Failed to get receipt for tx ${txHash}`);
            console.error(rawError);

            setTransactionState({
              type: "failed",
              id,
              error: new Error("Failed")
            });
          }
        }
      };

      console.log(`Start monitoring tx ${txHash}`);
      waitForConfirmation();
      store.refresh();

      return () => {
        if (!finished) {
          setTransactionState({ type: "idle" });
          console.log(`Cancel monitoring tx ${txHash}`);
          cancelled = true;
        }
      };
    }
  }, [store, id, tx, setTransactionState]);

  useEffect(() => {
    if (transactionState.type === "confirmedOneShot" && id) {
      // hack: the txn confirmed state lasts 5 seconds which blocks other states, review with Dani
      setTransactionState({ type: "confirmed", id });
      store.refresh();
    } else if (
      transactionState.type === "confirmed" ||
      transactionState.type === "failed" ||
      transactionState.type === "cancelled"
    ) {
      let cancelled = false;

      setTimeout(() => {
        if (!cancelled) {
          setTransactionState({ type: "idle" });
          store.refresh();
        }
      }, 5000);

      store.refresh();
      return () => {
        cancelled = true;
      };
    }
  }, [store, transactionState.type, setTransactionState, id]);

  if (transactionState.type === "idle" || transactionState.type === "waitingForApproval") {
    return null;
  }

  return (
    <TransactionStatus
      state={transactionState.type}
      message={transactionState.type === "failed" ? transactionState.error.message : undefined}
    />
  );
};
