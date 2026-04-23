import React from 'react';

const HospitalForm = ({ extraData, updateExtraData }) => {
  return (
    <div className="category-specific-form">
      <div className="section-header">
        <span className="section-icon">🏥</span>
        <span>Hospital Configuration</span>
      </div>
      <div className="grid-2">
        <div className="field-group">
          <label>Number of Beds</label>
          <input 
            type="number" 
            value={extraData.beds || ""} 
            onChange={(e) => updateExtraData('beds', e.target.value)}
            placeholder="e.g. 50"
          />
        </div>
        <div className="field-group">
          <label>Emergency Support</label>
          <select 
            value={extraData.emergency || "no"} 
            onChange={(e) => updateExtraData('emergency', e.target.value)}
          >
            <option value="yes">Yes (24/7)</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>
      <div className="field-group" style={{ marginTop: '15px' }}>
        <label>Specialized Departments (Comma separated)</label>
        <textarea 
          value={extraData.departments || ""} 
          onChange={(e) => updateExtraData('departments', e.target.value)}
          placeholder="e.g. Cardiology, Neurology, Pediatrics"
          rows={2}
        />
      </div>
    </div>
  );
};

export default HospitalForm;
