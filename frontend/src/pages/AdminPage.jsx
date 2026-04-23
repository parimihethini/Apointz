import React, { useEffect, useState } from "react";
import { api } from "../api";
import { showToast } from "../components/ToastHost";
import { formatRating } from "../utils";

const AdminPage = () => {
  const [services, setServices] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [bookings, setBookings] = useState([]);

  const [serviceForm, setServiceForm] = useState({ name: "", description: "" });
  const [businessForm, setBusinessForm] = useState({
    name: "",
    address: "",
    city: "",
    service_id: "",
  });
  const [slotForm, setSlotForm] = useState({
    business_id: "",
    date: "",
    start_time: "",
    end_time: "",
  });

  const loadServices = async () => {
    const { data } = await api.get("/services");
    setServices(data);
  };

  const loadBookings = async () => {
    const { data } = await api.get("/admin/bookings");
    setBookings(data);
  };

  const loadBusinesses = async () => {
    // Load businesses across all services for now
    const all = [];
    for (const s of services) {
      // eslint-disable-next-line no-await-in-loop
      const { data } = await api.get(`/services/${s.id}/businesses`);
      all.push(...data);
    }
    setBusinesses(all);
  };

  useEffect(() => {
    loadServices().catch(() => {
      showToast("Unable to load services.", "error");
    });
    loadBookings().catch(() => {
      showToast("Unable to load bookings.", "error");
    });
  }, []);

  useEffect(() => {
    if (services.length) {
      loadBusinesses().catch(() => {
        showToast("Unable to load businesses.", "error");
      });
    }
  }, [services]);

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/services", serviceForm);
      showToast("Service created.", "success");
      setServiceForm({ name: "", description: "" });
      loadServices();
    } catch (err) {
      const msg = err.response?.data?.message || "Unable to create service.";
      showToast(msg, "error");
    }
  };

  const handleBusinessSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/businesses", {
        ...businessForm,
        service_id: Number(businessForm.service_id),
      });
      showToast("Business created.", "success");
      setBusinessForm({ name: "", address: "", city: "", service_id: "" });
      loadBusinesses();
    } catch (err) {
      const msg = err.response?.data?.message || "Unable to create business.";
      showToast(msg, "error");
    }
  };

  const handleSlotSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/admin/businesses/${slotForm.business_id}/slots`, {
        date: slotForm.date,
        start_time: slotForm.start_time,
        end_time: slotForm.end_time,
      });
      showToast("Slot created.", "success");
      setSlotForm({ business_id: "", date: "", start_time: "", end_time: "" });
    } catch (err) {
      const msg = err.response?.data?.message || "Unable to create slot.";
      showToast(msg, "error");
    }
  };

  return (
    <div className="page admin-page">
      <section className="glass admin-grid">
        <div className="admin-column">
          <h2>Services</h2>
          <form onSubmit={handleServiceSubmit} className="form-vertical">
            <div className="field-group">
              <label>Name</label>
              <input
                value={serviceForm.name}
                onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                required
              />
            </div>
            <div className="field-group">
              <label>Description</label>
              <input
                value={serviceForm.description}
                onChange={(e) =>
                  setServiceForm({ ...serviceForm, description: e.target.value })
                }
              />
            </div>
            <button className="btn-primary small" type="submit">
              Add service
            </button>
          </form>

          <ul className="simple-list">
            {services.map((s) => (
              <li key={s.id}>
                <strong>{s.name}</strong>
                <span className="muted small">{s.description}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="admin-column">
          <h2>Businesses</h2>
          <form onSubmit={handleBusinessSubmit} className="form-vertical">
            <div className="field-group">
              <label>Name</label>
              <input
                value={businessForm.name}
                onChange={(e) => setBusinessForm({ ...businessForm, name: e.target.value })}
                required
              />
            </div>
            <div className="field-group">
              <label>Address</label>
              <input
                value={businessForm.address}
                onChange={(e) => setBusinessForm({ ...businessForm, address: e.target.value })}
                required
              />
            </div>
            <div className="field-group">
              <label>City</label>
              <input
                value={businessForm.city}
                onChange={(e) => setBusinessForm({ ...businessForm, city: e.target.value })}
                required
              />
            </div>
            <div className="field-group">
              <label>Service</label>
              <select
                value={businessForm.service_id}
                onChange={(e) =>
                  setBusinessForm({ ...businessForm, service_id: e.target.value })
                }
                required
              >
                <option value="">Select</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn-primary small" type="submit">
              Add business
            </button>
          </form>

          <ul className="simple-list">
            {businesses.map((b) => (
              <li key={b.id}>
                <strong>{b.name}</strong>
                <span className="muted small">
                  {b.city} · rating{" "}
                  {b.rating_count ? `${formatRating(b.average_rating)} (${b.rating_count})` : "N/A"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="admin-column">
          <h2>Time slots</h2>
          <form onSubmit={handleSlotSubmit} className="form-vertical">
            <div className="field-group">
              <label>Business</label>
              <select
                value={slotForm.business_id}
                onChange={(e) => setSlotForm({ ...slotForm, business_id: e.target.value })}
                required
              >
                <option value="">Select</option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} – {b.city}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-row">
              <div className="field-group">
                <label>Date</label>
                <input
                  type="date"
                  value={slotForm.date}
                  onChange={(e) => setSlotForm({ ...slotForm, date: e.target.value })}
                  required
                />
              </div>
              <div className="field-group">
                <label>Start</label>
                <input
                  type="time"
                  value={slotForm.start_time}
                  onChange={(e) =>
                    setSlotForm({ ...slotForm, start_time: e.target.value })
                  }
                  required
                />
              </div>
              <div className="field-group">
                <label>End</label>
                <input
                  type="time"
                  value={slotForm.end_time}
                  onChange={(e) =>
                    setSlotForm({ ...slotForm, end_time: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <button className="btn-primary small" type="submit">
              Add slot
            </button>
          </form>

          <h3 className="subheading">Recent bookings</h3>
          <ul className="simple-list compact">
            {bookings.map((b) => (
              <li key={b.id}>
                <strong>
                  #{b.id} · {b.business.name}
                </strong>
                <span className="muted small">
                  {b.date} · {b.start_time} – {b.end_time} · user {b.user_id} · {b.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
};

export default AdminPage;

