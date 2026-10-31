import { useEffect, useRef, useState } from "react";
import { ApiError, getOffer, getOffers, type FoodOffer, type OfferSort } from "../lib/api";

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
  const requestVersionRef = useRef(0);
  const [userCoordinates, setUserCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  async function loadOffers(
    overrides: {
      query?: string;
      city?: string;
      sort?: Exclude<OfferSort, "distance">;
    } = {},
  ) {
    const requestVersion = ++requestVersionRef.current;
    const activeQuery = overrides.query ?? search;
    const activeCity = overrides.city ?? city;
    const activeSort = overrides.sort ?? sort;
    setLoading(true);
    setError("");

    try {
      const items = await getOffers({
        query: activeQuery,
        city: activeCity,
        sort: nearby && userCoordinates ? "distance" : activeSort,
        latitude:
          nearby && userCoordinates ? userCoordinates.latitude : undefined,
        longitude:
          nearby && userCoordinates ? userCoordinates.longitude : undefined,
        radius_km: nearby && userCoordinates ? 10 : undefined,
      });
      if (requestVersion === requestVersionRef.current) {
        setOffers(items);
      }
    } catch (err) {
      if (requestVersion === requestVersionRef.current) {
        setError(
          err instanceof ApiError
            ? err.message
            : "ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.",
        );
      }
    } finally {
      if (requestVersion === requestVersionRef.current) {
        setLoading(false);
      }
    }
  }

  async function loadOffer(offerId: number): Promise<FoodOffer | null> {
    const requestVersion = ++requestVersionRef.current;
    setLoading(true);
    setError("");

    try {
      const offer = await getOffer(offerId);
      if (requestVersion === requestVersionRef.current) {
        setOffers((current) =>
          current.some((item) => item.id === offer.id)
            ? current
            : [...current, offer],
        );
      }
      return offer;
    } catch (err) {
      if (requestVersion === requestVersionRef.current) {
        const apiError =
          err instanceof ApiError
            ? err
            : new ApiError("دریافت این پیشنهاد انجام نشد.", 500);
        setError(apiError.message);
      }
      // The hook owns the error state; callers can safely trigger loading
      // without an unhandled rejected promise from a fire-and-forget effect.
      return null;
    } finally {
      if (requestVersion === requestVersionRef.current) {
        setLoading(false);
      }
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
    loadOffer,
    enableNearby,
  };
}
