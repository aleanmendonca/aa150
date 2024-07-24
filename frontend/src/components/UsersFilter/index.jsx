import { Box, Chip, TextField, Checkbox } from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import React, { useEffect, useState } from "react";
import toastError from "../../errors/toastError";
import { Select, MenuItem } from "@material-ui/core";
import api from "../../services/api";
import FormControl from "@material-ui/core/FormControl";
import { i18n } from "../../translate/i18n";

export function UsersFilter({ onFiltered, initialUsers }) {
  const [users, setUsers] = useState([]);
  const [selecteds, setSelecteds] = useState([]);

  useEffect(() => {
    async function fetchData() {
      await loadUsers();
    }
    fetchData();
  }, []);

  useEffect(() => {
    setSelecteds([]);
    if (
      Array.isArray(initialUsers) &&
      Array.isArray(users) &&
      users.length > 0
    ) {
      onChange(initialUsers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUsers, users]);

  const loadUsers = async () => {
    try {
      const { data } = await api.get(`/users/list`);
      const userList = data.map((u) => ({ id: u.id, name: u.name }));
      setUsers(userList);
    } catch (err) {
      toastError(err);
    }
  };
  const handleChange = (event) => {
    const selectedValues = event.target.value;
    setSelecteds(selectedValues);
    onFiltered(selectedValues);
  };
  const onChange = async (value) => {
    setSelecteds(value);
    onFiltered(value);
  };

  return (
    <FormControl fullWidth margin="dense">
      <Select
        multiple
        displayEmpty
        variant="outlined"
        value={selecteds}
        onChange={handleChange}
        renderValue={() => "Usuários"}
      >
        {users.map((user) => (
          <MenuItem key={user.id} value={user}>
            <Checkbox checked={selecteds?.includes(user)} />
            {user.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}