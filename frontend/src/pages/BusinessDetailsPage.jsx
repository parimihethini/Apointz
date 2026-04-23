import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api";
import { showToast } from "../components/ToastHost";
import MapView from "../components/MapView";
import PageWrapper from "../components/PageWrapper";
import { useAuth } from "../AuthContext";

const BusinessDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [business, setBusiness] = useState(null);
  const [reviews, setReviews] = useState({ reviews: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [{ data: prof }, { data: rev }] = await Promise.all([
          api.get(`/business/${id}`),
          api.get(`/businesses/${id}/reviews`),
        ]);
        setBusiness(prof);
        setReviews(rev || { reviews: [] });
      } catch (err) {
        showToast("Business not found.", "error");
        navigate("/services");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, navigate]);

  return (
    <PageWrapper>
      <div className="business-page-wrapper">
        <div className="dashboard-main-modern">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loader">
                <p>Loading business...</p>
              </motion.div>
            ) : !business ? (
              <motion.div key="empty">
                <p>Business not found</p>
              </motion.div>
            ) : (
              <motion.div key="content">
                <h1>{business.name}</h1>

                <p>{business.address}</p>

                {business.map_url && (
                  <iframe
                    src={business.map_url}
                    width="100%"
                    height="300"
                    style={{ border: 0 }}
                    loading="lazy"
                    title="map"
                  />
                )}

                <h2>Reviews</h2>

                {reviews.reviews?.length ? (
                  reviews.reviews.map((r) => (
                    <div key={r.id}>
                      <p>{r.comment}</p>
                    </div>
                  ))
                ) : (
                  <p>No reviews</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* STYLE FIXED */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
            .business-page-wrapper {
              padding: 20px;
            }
          `,
          }}
        />
      </div>
    </PageWrapper>
  );
};

export default BusinessDetailsPage;