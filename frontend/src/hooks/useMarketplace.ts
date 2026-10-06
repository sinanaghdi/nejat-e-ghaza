import { useEffect, useState } from "react";
import { ApiError, getOffers, type FoodOffer, type OfferSort } from "../lib/api";

export function useMarketplace() {
  const [offers, setOffers] = useState<FoodOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [sort, setSort] = useState<Exclude<OfferSort, "distance">>("newest");
  const [nearby, setNearby] = useState(false);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "loading" | "denied" | "ready"
  >("idle");
  const [userCoordinates, setUserCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  async function loadOffers() {
    setLoading(true);
    setError("");

    try {
      const items = await getOffers({
        query: search,
        city,
        sort: nearby && userCoordinates ? "distance" : sort,
        latitude:
          nearby && userCoordinates ? userCoordinates.latitude : undefined,
        longitude:
          nearby && userCoordinates ? userCoordinates.longitude : undefined,
        radius_km: nearby && userCoordinates ? 10 : undefined,
      });
      setOffers(items);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOffers();
  }, []);

  useEffect(() => {
    if (nearby && userCoordinates) {
      void loadOffers();
    }
  }, [nearby, userCoordinates]);

  function enableNearby() {
    if (!navigator.geolocation) {
      setLocationStatus("denied");
      return;
    }

    setLocationStatus("loading");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setNearby(true);
        setLocationStatus("ready");
      },
      () => {
        setNearby(false);
        setLocationStatus("denied");
      },
      {
        enableHighAccuracy: false,
        maximumAge: 300000,
        timeout: 10000,
      },
    );
  }

  const availableOffers = offers.filter(
    (offer) => offer.is_active && offer.available_quantity > 0,
  );

  return {
    offers,
    loading,
    error,
    search,
    city,
    sort,
    nearby,
    locationStatus,
    userCoordinates,
    availableOffers,
    setSearch,
    setCity,
    setSort,
    loadOffers,
    enableNearby,
  };
}
