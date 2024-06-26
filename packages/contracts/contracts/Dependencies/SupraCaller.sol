// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Interfaces/ISupraCaller.sol";
import "./ISupra.sol";
import "./SafeMath.sol";
/*
* This contract has a single external function that calls Supra: getSupraCurrentValue().
*
* The function is called by the Liquity contract PriceFeed.sol. If any of its inner calls to Supra revert,
* this function will revert, and PriceFeed will catch the failure and handle it accordingly.
*
*/
contract SupraCaller is ISupraCaller {
    using SafeMath for uint256;

    ISupra public supra;

    constructor (address _supraMasterAddress) public {
        supra = ISupra(_supraMasterAddress);
    }

    /*
    * @dev Allows the user to get the latest value for the specified priceIndex
    * @param _priceIndex is the index to look up the value for
    * @return ifRetrieve bool true if it is able to retrieve a value, the value, and the value's timestamp
    * @return value the value retrieved
    * @return _timestampRetrieved the value's timestamp
    */
    function getSupraCurrentValue(uint256 _priceIndexHBARUSD, uint256 _priceIndexUSDCH)
    external
    view
    override
    returns (
        bool ifRetrieve,
        uint256 value,
        uint256 _timestampRetrieved
    )
    {
        (uint256 roundHBARUSD, uint256 decimalsHBARUSD, uint256 _timeHBARUSD, uint256 _priceHBARUSD) = supra.getSvalue(_priceIndexHBARUSD);
        (uint256 roundUSHCHF, uint256 decimalsUSHCHF, uint256 _timeUSHCHF, uint256 _priceUSHCHF) = supra.getSvalue(_priceIndexUSDCH);

        uint256 basePriceHBARUSD = _scalePriceByDigits(_priceHBARUSD, decimalsHBARUSD);
        uint256 basePriceUSHCHF = _scalePriceByDigits(_priceUSHCHF, decimalsUSHCHF);

        uint256 hbarChfPrice = (basePriceHBARUSD * basePriceUSHCHF) / 1e8;

        uint256 publishTime = _timeHBARUSD < _timeUSHCHF ? _timeHBARUSD : _timeUSHCHF;

        if (hbarChfPrice > 0) {
            uint256 positiveValue = hbarChfPrice;
            return (true, positiveValue, publishTime);
        }
        return (false, 0, publishTime);
    }

    function _scalePriceByDigits(uint _price, uint decimals) internal pure returns (uint) {
        return _price.div(10**(decimals - 8));
    }
}
