import { render, fireEvent } from "@testing-library/react";

import { Decimal, defaults as constants, Trove } from "@liquity/lib-base";

import App from "./App";

const params = { depositCollateral: Decimal.from(20), borrowHCHF: constants.HCHF_MINIMUM_NET_DEBT };
const trove = Trove.create(constants, params);

/*
 * Just a quick and dirty testcase to prove that the approach can work in our CI pipeline.
 */
test("there's no smoke", async () => {
  const { getByText, getByLabelText, findByText } = render(<App />);

  fireEvent.click(await findByText(/connect wallet/i));
  fireEvent.click(getByText(/browser wallet/i));

  expect(await findByText(/you can borrow lusd by opening a trove/i)).toBeInTheDocument();

  fireEvent.click(getByText(/open trove/i));
  fireEvent.click(getByLabelText(/collateral/i));
  fireEvent.change(getByLabelText(/^collateral$/i), { target: { value: `${trove.collateral}` } });
  fireEvent.click(getByLabelText(/^borrow$/i));
  fireEvent.change(getByLabelText(/^borrow$/i), { target: { value: `${trove.debt}` } });
  fireEvent.click(await findByText(/confirm/i));

  expect(await findByText(/adjust/i)).toBeInTheDocument();
});
