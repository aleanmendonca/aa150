import { FormControl, MenuItem, Select } from "@material-ui/core";
import React, { useState } from "react";

export function StatusFilter({ onFiltered }) {
  const [selected, setSelected] = useState('');

  const statuses = [
    { id: 1, name: 'pending' },
    { id: 2, name: "closed" },
    { id: 3, name: 'open' },
  ];

  const handleChange = (event) => {
    setSelected(event.target.value);
    onFiltered(event.target.value);
  };

  return (
    <FormControl fullWidth margin="dense">
      <Select
        displayEmpty
        variant="outlined"
        value={selected}
        onChange={handleChange}
      >
        <MenuItem value="">
          <em>Status</em>
        </MenuItem>
        {statuses.map((status) => (
          <MenuItem key={status.id} value={status.name}>
            {status.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}