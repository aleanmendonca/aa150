import { Box, Chip, TextField } from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import React, { useEffect, useState } from "react";
import toastError from "../../errors/toastError";
import api from "../../services/api";

export function QueuesFilter({ onFiltered, initialQueues }) {
  const [queues, setQueues] = useState([]);
  const [selecteds, setSelecteds] = useState([]);

  useEffect(() => {
    async function fetchData() {
      await loadQueues();
    }
    fetchData();
  }, []);

  useEffect(() => {
    setSelecteds([]);
    if (
      Array.isArray(initialQueues) &&
      Array.isArray(queues) &&
      queues.length > 0
    ) {
      onChange(initialQueues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQueues, queues]);

  const loadQueues = async () => {
    console.log('da um bisu aqui brow11111')
    try {
      const { data } = await api.get(`/queue`);
      console.log(data)
      console.log('da um bisu aqui brow')
      const queuesList = data.map((u) => ({ id: u.id, name: u.name }));
      setQueues(queuesList);
    } catch (err) {
      toastError(err);
    }
  };

  const onChange = async (value) => {
    setSelecteds(value);
    onFiltered(value);
  };

  return (
    <Box style={{ padding: "0px 10px 10px" }}>
      <Autocomplete
        multiple
        size="small"
        options={queues}
        value={selecteds}
        onChange={(e, v, r) => onChange(v)}
        getOptionLabel={(option) => option.name}
        getOptionSelected={(option, value) => {
          return (
            option?.id === value?.id ||
            option?.name.toLowerCase() === value?.name.toLowerCase()
          );
        }}
        renderTags={(value, getQueueProps) =>
          value.map((option, index) => (
            <Chip
              variant="outlined"
              style={{
                backgroundColor: "#bfbfbf",
                textShadow: "1px 1px 1px #000",
                color: "white",
              }}
              label={option.name}
              {...getQueueProps({ index })}
              size="small"
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            placeholder="Departamentos"
          />
        )}
      />
    </Box>
  );
}
