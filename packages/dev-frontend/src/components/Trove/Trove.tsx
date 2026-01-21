import React from "react";
import { TroveManager } from "./TroveManager";
import { ReadOnlyTrove } from "./ReadOnlyTrove";
import { NoTrove } from "./NoTrove";
import { Opening } from "./Opening";
import { Adjusting } from "./Adjusting";
import { RedeemedTrove } from "./RedeemedTrove";
import { useTroveView } from "./context/TroveViewContext";
import { LiquidatedTrove } from "./LiquidatedTrove";
import { Decimal } from "@liquity/lib-base";
// import { Tabs } from "../Tabs";
// import { useLiquitySelector } from "@liquity/lib-react";
// import { InfoMessage } from "../InfoMessage";
// import { CollateralSurplusAction } from "../CollateralSurplusAction";
// import { Borrow } from "./Borrow";
// import { CurrentUserTrove } from "./CurrentUserTrove";
// import { Repay } from "./Repay";
// import { Withdraw } from "./Withdraw";

export const Trove: React.FC = props => {
  const { view } = useTroveView();

  switch (view) {
    // loading state not needed, as main app has a loading spinner that blocks render until the liquity backend data is available
    case "ACTIVE": {
      return <ReadOnlyTrove {...props} />;
    }
    case "ADJUSTING": {
      return <Adjusting {...props} />;
    }
    case "CLOSING": {
      return <TroveManager {...props} collateral={Decimal.ZERO} debt={Decimal.ZERO} />;
    }
    case "OPENING": {
      return <Opening {...props} />;
    }
    case "LIQUIDATED": {
      return <LiquidatedTrove {...props} />;
    }
    case "REDEEMED": {
      return <RedeemedTrove {...props} />;
    }
    case "NONE": {
      return <NoTrove {...props} />;
    }
  }
};

// export const Trove: React.FC = () => {
//   const state = useLiquitySelector(state => {
//     return {
//       trove: state.trove
//     };
//   });
//
//   return (
//     <div role="presentation">
//       {state.trove.status === "closedByLiquidation" && !state.trove.isEmpty ? (
//         <>
//           <InfoMessage title="Your Trove has been liquidated.">
//             Please reclaim your remaining collateral before opening a new Trove.
//           </InfoMessage>
//           <CollateralSurplusAction />
//         </>
//       ) : state.trove.status === "closedByRedemption" && !state.trove.isEmpty ? (
//         <>
//           <InfoMessage title="Your Trove has been redeemed.">
//             Please reclaim your remaining collateral before opening a new Trove.
//           </InfoMessage>
//           <CollateralSurplusAction />
//         </>
//       ) : (
//         <>
//           {!state.trove.isEmpty && <CurrentUserTrove userTrove={state.trove} />}
//
//           <Tabs
//             label="Trove Operations"
//             tabs={[
//               {
//                 title: "Borrow",
//                 content: <Borrow />,
//                 disabled: !state.trove.isEmpty
//               },
//               {
//                 title: "Repay",
//                 content: <Repay />,
//                 disabled: state.trove.isEmpty
//               },
//               {
//                 title: "Withdraw",
//                 content: <Withdraw />,
//                 disabled: state.trove.isEmpty
//               }
//             ]}
//           />
//         </>
//       )}
//     </div>
//   );
// };
