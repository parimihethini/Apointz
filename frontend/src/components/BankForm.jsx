import React from 'react';

const BankForm = ({ extraData, updateExtraData }) => {
  return (
    <div className="category-specific-form">
      <div className="section-header">
        <span className="section-icon">🏦</span>
        <span>Banking Info</span>
      </div>
      <div className="grid-2">
        <div className="field-group">
          <label>Bank Type</label>
          <select 
            value={extraData.bank_type || "retail"} 
            onChange={(e) => updateExtraData('bank_type', e.target.value)}
          >
            <option value="retail">Retail/Commercial</option>
            <option value="corporate">Corporate</option>
            <option value="private">Private Banking</option>
          </select>
        </div>
        <div className="field-group">
          <label>Number of Counters</label>
          <input 
            type="number" 
            value={extraData.counters || ""} 
            onChange={(e) => updateExtraData('counters', e.target.value)}
            placeholder="e.g. 10"
          />
        </div>
      </div>
      <div className="form-checkbox-group" style={{ marginTop: '15px' }}>
        <input 
          type="checkbox" 
          id="atm"
          checked={!!extraData.atm}
          onChange={(e) => updateExtraData('atm', e.target.checked)}
        />
        <label htmlFor="atm">24/7 ATM in Campus</label>
      </div>
    </div>
  );
};

export default BankForm;
