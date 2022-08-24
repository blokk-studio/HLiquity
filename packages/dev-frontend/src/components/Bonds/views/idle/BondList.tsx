import React from "react";
import { Flex } from "theme-ui";
import { Redirect, Route, Switch, useRouteMatch } from "react-router-dom";
import { Link } from "../../../Link";
import { FilteredBondList } from "./FilteredBondList";

export const BondList: React.FC = () => {
  const { url, path } = useRouteMatch();

  return (
    <>
      <Flex as="nav">
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

      <Switch>
        <Route exact path={path}>
          <Redirect to={`${path}/all`} />
        </Route>
        <Route path={`${path}/:bondFilter`}>
          <FilteredBondList />
        </Route>
      </Switch>
    </>
  );
};
