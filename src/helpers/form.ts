import { formatUnits } from 'ethers';
import * as Yup from 'yup';

/**
 * Common helper to get a yup schema for an amount field.
 */
export function getYupAmountField(
  yup: typeof Yup,
  decimals: number,
  totalBalanceBN: bigint,
) {
  return yup
    .number()
    .min(+formatUnits('1', decimals))
    .max(totalBalanceBN ? +formatUnits(totalBalanceBN, decimals) : 0)
    .test(
      'maxDecimals',
      `Amount cannot have more than ${decimals} decimal places`,
      value => {
        if (value === undefined || value === null) return true;
        const valueStr = value.toString();
        const decimalIndex = valueStr.indexOf('.');
        if (decimalIndex === -1) return true;
        const decimalPlaces = valueStr.length - decimalIndex - 1;
        return decimalPlaces <= decimals;
      },
    )
    .required('Enter amount');
}
