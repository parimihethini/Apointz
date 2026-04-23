import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import { showToast } from "../components/ToastHost";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState("customer"); // 'customer' or 'business'
  const [customerForm, setCustomerForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });
  const [businessForm, setBusinessForm] = useState({
    owner_name: "",
    business_name: "",
    email: "",
    password: "",
    phone: "",
    category: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    opening_time: "",
    closing_time: "",
    services_offered: "",
    map_url: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "customer") {
        await api.post("/auth/register", customerForm);
      } else {
        await api.post("/auth/register-business", businessForm);
      }
      showToast("Account created. Please log in.", "success");
      navigate("/login");
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed.";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page">
      <section className="auth-card glass">
        <h2>Create your account</h2>
        <p className="muted small">
          Choose whether you&apos;re booking visits or managing a business.
        </p>

        <div className="pill-row" style={{ marginTop: 12, marginBottom: 8 }}>
          <button
            type="button"
            className={mode === "customer" ? "pill-pill selected" : "pill-pill"}
            onClick={() => setMode("customer")}
          >
            I&apos;m a customer
          </button>
          <button
            type="button"
            className={mode === "business" ? "pill-pill selected" : "pill-pill"}
            onClick={() => setMode("business")}
          >
            I run a business
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-vertical">
          {mode === "customer" ? (
            <>
              <div className="field-group">
                <label>Name</label>
                <input
                  value={customerForm.name}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="field-group">
                <label>Email</label>
                <input
                  type="email"
                  value={customerForm.email}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="field-group">
                <label>Phone</label>
                <input
                  type="tel"
                  placeholder="Optional"
                  value={customerForm.phone}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, phone: e.target.value })
                  }
                />
              </div>
              <div className="field-group">
                <label>Password</label>
                <input
                  type="password"
                  value={customerForm.password}
                  onChange={(e) =>
                    setCustomerForm({
                      ...customerForm,
                      password: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div className="field-group">
                <label>Owner name</label>
                <input
                  value={businessForm.owner_name}
                  onChange={(e) =>
                    setBusinessForm({
                      ...businessForm,
                      owner_name: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="field-group">
                <label>Business name</label>
                <input
                  value={businessForm.business_name}
                  onChange={(e) =>
                    setBusinessForm({
                      ...businessForm,
                      business_name: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="field-group">
                <label>Email</label>
                <input
                  type="email"
                  value={businessForm.email}
                  onChange={(e) =>
                    setBusinessForm({
                      ...businessForm,
                      email: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="field-group">
                <label>Password</label>
                <input
                  type="password"
                  value={businessForm.password}
                  onChange={(e) =>
                    setBusinessForm({
                      ...businessForm,
                      password: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="field-group">
                <label>Phone</label>
                <input
                  value={businessForm.phone}
                  onChange={(e) =>
                    setBusinessForm({
                      ...businessForm,
                      phone: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="field-group">
                <label>Category</label>
                <input
                  placeholder="salon, hospital, bank, clinic..."
                  value={businessForm.category}
                  onChange={(e) =>
                    setBusinessForm({
                      ...businessForm,
                      category: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="field-group">
                <label>Address</label>
                <input
                  value={businessForm.address}
                  onChange={(e) =>
                    setBusinessForm({
                      ...businessForm,
                      address: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="field-row">
                <div className="field-group">
                  <label>City</label>
                  <input
                    value={businessForm.city}
                    onChange={(e) =>
                      setBusinessForm({
                        ...businessForm,
                        city: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="field-group">
                  <label>State</label>
                  <input
                    value={businessForm.state}
                    onChange={(e) =>
                      setBusinessForm({
                        ...businessForm,
                        state: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="field-group">
                  <label>Pincode</label>
                  <input
                    value={businessForm.pincode}
                    onChange={(e) =>
                      setBusinessForm({
                        ...businessForm,
                        pincode: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="field-row">
                <div className="field-group">
                  <label>Opening time</label>
                  <input
                    type="time"
                    value={businessForm.opening_time}
                    onChange={(e) =>
                      setBusinessForm({
                        ...businessForm,
                        opening_time: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="field-group">
                  <label>Closing time</label>
                  <input
                    type="time"
                    value={businessForm.closing_time}
                    onChange={(e) =>
                      setBusinessForm({
                        ...businessForm,
                        closing_time: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="field-group">
                <label>Services offered</label>
                <textarea
                  rows={3}
                  value={businessForm.services_offered}
                  onChange={(e) =>
                    setBusinessForm({
                      ...businessForm,
                      services_offered: e.target.value,
                    })
                  }
                />
              </div>
              <div className="field-group">
                <label>Google Maps Location URL (Embed Link)</label>
                <input
                  placeholder="Paste Google Maps embed URL here"
                  value={businessForm.map_url}
                  onChange={(e) =>
                    setBusinessForm({
                      ...businessForm,
                      map_url: e.target.value,
                    })
                  }
                />
              </div>
            </>
          )}
          <button className="btn-primary full" type="submit" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="muted small">
          Already using Apointz? <Link to="/login">Login instead</Link>
        </p>
      </section>
    </div>
  );
};

export default RegisterPage;

