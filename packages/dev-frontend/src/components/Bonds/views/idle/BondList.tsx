import React from "react";
import { Flex } from "theme-ui";
import { Navigate, Route, Routes, useMatch } from "react-router-dom";
import { Link } from "../../../Link";
import { FilteredBondList } from "./FilteredBondList";
import { useBondView } from "../../context/BondViewContext";

export const BondList: React.FC = () => {
  const { bonds } = useBondView();
  // this match is most likely incorrect, but since we don't have
  // bonds in hliquity, i don't know what the pattern should be
  const match = useMatch("/");

  return (
    <>
      {bonds && (
        <Flex as="nav" mt={2}>
          <Link to={`${match?.pathname}/all`} p={2}>
            All
          </Link>
          <Link to={`${match?.pathname}/pending`} p={2}>
            Pending
          </Link>
          <Link to={`${match?.pathname}/claimed`} p={2}>
            Claimed
          </Link>
          <Link to={`${match?.pathname}/cancelled`} p={2}>
            Cancelled
          </Link>
        </Flex>
      )}

      <Routes>
        <Route
          path={match?.pattern.path ?? "/"}
          element={<Navigate to={`${match?.pattern.path}/pending`} />}
        />
        <Route path={`${match?.pattern.path}/:bondFilter`}>
          <FilteredBondList />
        </Route>
      </Routes>
    </>
  );
};
