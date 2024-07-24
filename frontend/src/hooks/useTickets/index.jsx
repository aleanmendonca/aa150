import { useState, useEffect } from "react";
import toastError from "../../errors/toastError";

import api from "../../services/api";

const useTickets = ({
  searchParam,
  tags,
  users,
  pageNumber,
  status,
  startDate,
  endDate,
  updatedAt,
  showAll,
  queueIds,
  withUnreadMessages,
}) => {
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [tickets, setTickets] = useState([]);

  useEffect(async () => {
    setLoading(true);
    try {
      const {data} = await api.get("/tickets", {
        params: {
          searchParam,
          pageNumber,
          tags,
          users,
          status,
          startDate,
          endDate,
          updatedAt,
          showAll,
          queueIds,
          withUnreadMessages,
        },
      });
      setTickets(data.tickets);
      setHasMore(data.hasMore);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      toastError(err);
    }

  }, [
    searchParam,
    tags,
    users,
    pageNumber,
    status,
    startDate,
    endDate,
    updatedAt,
    showAll,
    queueIds,
    withUnreadMessages,
  ]);

  return { tickets, loading, hasMore };
};

export default useTickets;