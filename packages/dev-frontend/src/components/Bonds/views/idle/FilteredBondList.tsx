import { useParams } from "react-router-dom";
import { useBondView } from "../../context/BondViewContext";
import type { BondStatus, Bond as BondType } from "../../context/transitions";
import { Bond } from "./Bond";

type BondFilter = "pending" | "claimed" | "cancelled";

const bondFilterToBondStatusMap: Record<BondFilter, BondStatus> = {
  pending: "PENDING",
  claimed: "CLAIMED",
  cancelled: "CANCELLED"
};

const getFilteredBonds = (bonds: BondType[], bondFilter: BondFilter) =>
  bonds.filter(bond => bond.status === bondFilterToBondStatusMap[bondFilter]);

type FilteredBondsParams = { bondFilter: BondFilter | "all" };

export const FilteredBondList = () => {
  const { bonds, optimisticBond } = useBondView();
  const { bondFilter } = useParams<FilteredBondsParams>();
  if (bonds === undefined) return null;

  const filteredBonds = bondFilter === "all" ? bonds : getFilteredBonds(bonds, bondFilter);
  return (
    <>
      {optimisticBond && <Bond bond={optimisticBond} style={{ mt: "16px" }} />}
      {filteredBonds.map((bond: BondType, idx: number) => {
        const isFirst = idx === 0 && !optimisticBond;
        const style = { mt: isFirst ? "16px" : "32px" };
        return <Bond bond={bond} key={idx} style={style} />;
      })}
    </>
  );
};
