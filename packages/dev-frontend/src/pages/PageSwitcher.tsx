import { useEffect, useState } from "react";
import { AddressZero } from "@ethersproject/constants";

import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

import { useLiquity } from "../hooks/LiquityContext";

import { UnregisteredFrontend } from "./UnregisteredFrontend";
import { FrontendRegistration } from "./FrontendRegistration";
import { FrontendRegistrationSuccess } from "./FrontendRegistrationSuccess";
import { AssociateAsFrontendOwner } from "./AssociateAsFrontendOwner";

const selectFrontend = ({ frontend }: LiquityStoreState) => frontend;

export const PageSwitcher: React.FC = ({ children }) => {
  const {
    account,
    liquity: {
      connection: { frontendTag }
    }
  } = useLiquity();

  const frontend = useLiquitySelector(selectFrontend);
  const unregistered = frontendTag !== AddressZero && frontend.status === "unregistered";
  const isFrontendOwner = account.toLowerCase() === frontendTag?.toLowerCase();
  const { userHasAssociatedWithHchf, userHasAssociatedWithHlqt } = useLiquitySelector(
    state => state
  );

  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (unregistered && isFrontendOwner) {
      setRegistering(true);
    }
  }, [unregistered, isFrontendOwner]);

  if (isFrontendOwner && unregistered) {
    return <FrontendRegistration />;
  }

  if (isFrontendOwner && (!userHasAssociatedWithHchf || !userHasAssociatedWithHlqt)) {
    return <AssociateAsFrontendOwner />;
  }

  if (registering && frontend.status === "registered") {
    return <FrontendRegistrationSuccess onDismiss={() => setRegistering(false)} />;
  }

  if (unregistered) {
    return <UnregisteredFrontend />;
  }

  return <>{children}</>;
};
