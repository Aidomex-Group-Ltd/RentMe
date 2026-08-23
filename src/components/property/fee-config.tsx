"use client";

import { useState, useEffect } from "react";
import { DollarSign, Calculator, Info } from "lucide-react";
import {
  calculatePropertyFees,
  PAYMENT_METHODS,
  type FeeBreakdown,
} from "@/lib/fees";
import { formatUGX } from "@/lib/utils";

interface FeeConfigProps {
  rent: number;
  deposit: number;
  agencyFee: number;
  serviceCharge: number;
  isAgentListing: boolean;
  onDepositChange: (value: number) => void;
  onAgencyFeeChange: (value: number) => void;
  onServiceChargeChange: (value: number) => void;
  onPaymentMethodsChange?: (methods: string[]) => void;
  /** Controlled minimum months; when omitted the component manages it internally. */
  minimumMonths?: number;
  onMinimumMonthsChange?: (value: number) => void;
}

export default function FeeConfig({
  rent,
  deposit,
  agencyFee,
  serviceCharge,
  isAgentListing,
  onDepositChange,
  onAgencyFeeChange,
  onServiceChargeChange,
  onPaymentMethodsChange,
  minimumMonths: controlledMinimumMonths,
  onMinimumMonthsChange,
}: FeeConfigProps) {
  const [internalMinimumMonths, setInternalMinimumMonths] = useState(1);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(["mobile_money_mtn", "cash"]);
  const [showBreakdown, setShowBreakdown] = useState(true);

  const minimumMonths =
    controlledMinimumMonths ?? internalMinimumMonths;

  const setMinimumMonths = (value: number) => {
    setInternalMinimumMonths(value);
    onMinimumMonthsChange?.(value);
  };

  const fees: FeeBreakdown = calculatePropertyFees({
    monthlyRent: rent,
    deposit,
    agencyFee,
    minimumMonths,
    paymentMethods,
    isAgentListing,
  });

  useEffect(() => {
    onServiceChargeChange(fees.serviceCharge);
  }, [fees.serviceCharge, onServiceChargeChange]);

  const handlePaymentMethodToggle = (methodId: string) => {
    const newMethods = paymentMethods.includes(methodId)
      ? paymentMethods.filter((m) => m !== methodId)
      : [...paymentMethods, methodId];
    setPaymentMethods(newMethods);
    onPaymentMethodsChange?.(newMethods);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Fee Configuration</h3>
        <button
          type="button"
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="text-sm text-brand-600 hover:text-brand-700"
        >
          {showBreakdown ? "Hide breakdown" : "Show breakdown"}
        </button>
      </div>

      {/* Security Deposit */}
      <div>
        <label className="label">Security Deposit (UGX)</label>
        <p className="text-xs text-gray-500 mb-2">
          Optional. Landlords decide whether to require a deposit.
        </p>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="number"
            value={deposit || ""}
            onChange={(e) => onDepositChange(parseInt(e.target.value) || 0)}
            className="input pl-10"
            placeholder="0"
            min="0"
          />
        </div>
        <p className="mt-1 text-xs text-gray-400">
          Enter 0 if no deposit is required
        </p>
      </div>

      {/* Agency Fee (Agent only) */}
      {isAgentListing ? (
        <div>
          <label className="label">Agency Fee (UGX)</label>
          <p className="text-xs text-gray-500 mb-2">
            Percentage-based fee charged by agents. Only applicable for agent listings.
          </p>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="number"
              value={agencyFee || ""}
              onChange={(e) => onAgencyFeeChange(parseInt(e.target.value) || 0)}
              className="input pl-10"
              placeholder="0"
              min="0"
            />
          </div>
          {agencyFee > 0 && rent > 0 && (
            <p className="mt-1 text-xs text-gray-400">
              ≈ {((agencyFee / rent) * 100).toFixed(1)}% of monthly rent
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-600">
            <Info className="mr-1 inline h-4 w-4 text-gray-400" />
            Agency fees are only available for agent-listed properties.
          </p>
        </div>
      )}

      {/* Service Charge (Auto-calculated) */}
      <div className="rounded-lg bg-blue-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Service Charge</p>
            <p className="text-xs text-gray-500">Automatically calculated at 5% of monthly rent</p>
          </div>
          <span className="text-lg font-bold text-brand-600">
            {formatUGX(fees.serviceCharge)}
          </span>
        </div>
      </div>

      {/* Minimum Months */}
      <div>
        <label className="label">Minimum Payment Months</label>
        <p className="text-xs text-gray-500 mb-2">
          How many months of rent are due upfront?
        </p>
        <select
          value={minimumMonths}
          onChange={(e) => setMinimumMonths(parseInt(e.target.value))}
          className="input"
        >
          <option value={1}>1 month</option>
          <option value={2}>2 months</option>
          <option value={3}>3 months</option>
          <option value={6}>6 months</option>
          <option value={12}>12 months (annual)</option>
        </select>
      </div>

      {/* Payment Methods */}
      <div>
        <label className="label">Accepted Payment Methods</label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((method) => (
            <label
              key={method.id}
              className={`flex items-center gap-2 rounded-lg border-2 p-3 text-sm transition-all cursor-pointer ${
                paymentMethods.includes(method.id)
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <input
                type="checkbox"
                checked={paymentMethods.includes(method.id)}
                onChange={() => handlePaymentMethodToggle(method.id)}
                className="rounded border-gray-300 text-brand-500"
              />
              {method.label}
            </label>
          ))}
        </div>
      </div>

      {/* Move-in Cost Breakdown */}
      {showBreakdown && rent > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Calculator className="h-5 w-5 text-brand-500" />
            <h4 className="font-semibold text-gray-900">Move-in Cost Breakdown</h4>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Rent ({fees.minimumMonths} month{fees.minimumMonths > 1 ? "s" : ""})
              </span>
              <span className="font-medium text-gray-900">{formatUGX(fees.rentSubtotal)}</span>
            </div>

            {fees.deposit > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Security Deposit</span>
                <span className="font-medium text-gray-900">{formatUGX(fees.deposit)}</span>
              </div>
            )}

            {fees.agencyFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Agency Fee</span>
                <span className="font-medium text-gray-900">{formatUGX(fees.agencyFee)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Service Charge (5%)</span>
              <span className="font-medium text-gray-900">{formatUGX(fees.serviceCharge)}</span>
            </div>

            <div className="my-2 border-t border-gray-200" />

            <div className="flex justify-between">
              <span className="font-semibold text-gray-900">Total Move-in Cost</span>
              <span className="text-xl font-bold text-brand-600">
                {formatUGX(fees.totalMoveInCost)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
