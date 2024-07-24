import { Box, Chip, TextField, Checkbox } from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import React, { useEffect, useState } from "react";
import toastError from "../../errors/toastError";
import { Select, MenuItem } from "@material-ui/core";
import api from "../../services/api";
import FormControl from "@material-ui/core/FormControl";
import { i18n } from "../../translate/i18n";

export function TagsFilter({ onFiltered }) {
  const [tags, setTags] = useState([]);
  const [selecteds, setSelecteds] = useState([]);

  useEffect(() => {
    async function fetchData() {
      await loadTags();
    }
    fetchData();
  }, []);

  const loadTags = async () => {
    try {
      const { data } = await api.get(`/tags/list`);
      setTags(data);
    } catch (err) {
      toastError(err);
    }
  };

  const handleChange = (event) => {
    const selectedValues = event.target.value;
    setSelecteds(selectedValues);
    onFiltered(selectedValues);
  };

  return (
    <FormControl fullWidth margin="dense">
      <Select
        multiple
        displayEmpty
        variant="outlined"
        value={selecteds}
        onChange={handleChange}
        renderValue={() => "Etiquetas"}
      >
        {tags.map((tag) => (
          <MenuItem key={tag.id} value={tag}>
            <Checkbox checked={selecteds?.includes(tag)} />
            {tag.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
