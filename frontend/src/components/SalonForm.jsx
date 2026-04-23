import React from 'react';

const SalonForm = ({ extraData, updateExtraData }) => {
  return (
    <div className="category-specific-form">
      <div className="section-header">
        <span className="section-icon">💇</span>
        <span>Salon & Spa Details</span>
      </div>
      <div className="grid-2">
        <div className="field-group">
          <label>Gender Served</label>
          <select 
            value={extraData.gender_focus || "unisex"} 
            onChange={(e) => updateExtraData('gender_focus', e.target.value)}
          >
            <option value="unisex">Unisex</option>
            <option value="men">Men Only</option>
            <option value="women">Women Only</option>
          </select>
        </div>
        <div className="field-group">
          <label>Number of Stylists</label>
          <input 
            type="number" 
            value={extraData.stylists || ""} 
            onChange={(e) => updateExtraData('stylists', e.target.value)}
            placeholder="e.g. 5"
          />
        </div>
      </div>
      <div className="field-group" style={{ marginTop: '15px' }}>
        <div className="form-checkbox-group">
          <input 
            type="checkbox" 
            id="home_service"
            checked={!!extraData.home_service}
            onChange={(e) => updateExtraData('home_service', e.target.checked)}
          />
          <label htmlFor="home_service">Provide Home Services</label>
        </div>
      </div>
    </div>
  );
};

export default SalonForm;
