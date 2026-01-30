import React from "react";
import { Flex } from "theme-ui";
import { Navigate, Route, Routes, useResolvedPath } from "react-router-dom";
import { Link } from "../../../Link";
import { FilteredBondList } from "./FilteredBondList";
import { useBondView } from "../../context/BondViewContext";

export const BondList: React.FC = () => {
  const { bonds } = useBondView();
  const resolvedPath = useResolvedPath("");
  const url = resolvedPath.pathname;

  return (
    <>
      {bonds && (
        <Flex as="nav" mt={2}>
          <Link to={`${url}/all`} p={2}>
            All
          </Link>
          <Link to={`${url}/pending`} p={2}>
            Pending
          </Link>
          <Link to={`${url}/claimed`} p={2}>
            Claimed
          </Link>
          <Link to={`${url}/cancelled`} p={2}>
            Cancelled
          </Link>
        </Flex>
      )}

      <Routes>
        <Route path="/" element={<Navigate to="pending" replace />} />
        <Route path=":bondFilter" element={<FilteredBondList />} />
      </Routes>
    </>
  );
};
