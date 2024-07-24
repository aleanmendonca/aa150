import { useState, useEffect } from "react";
import toastError from "../../errors/toastError";

import api from "../../services/api";

const useMessages = ({ fromMe, dateStart, dateEnd }) => {
    const [loading, setLoading] = useState(true);
    const [count, setCount] = useState(0);

    useEffect(async () => {
        setLoading(true);
        try {
            const {data} = await api.get("/messages/all", {
                params: {
                    fromMe,
                    dateStart,
                    dateEnd,
                },
            });
            setCount(data.count);
            setLoading(false);
        } catch (err) {
            setLoading(false);
            toastError(err);
        }
    }, [dateStart, dateEnd]);

    return { count };
};

export default useMessages;
