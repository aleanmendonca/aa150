import React, { useEffect, useState } from "react";
import { Grid, FormControl, TextField, makeStyles } from "@material-ui/core";
import { toast } from 'react-toastify';
import useSettings from "../../../hooks/useSettings";
import api from "../../../services/api";

const useStyles = makeStyles((theme) => ({
  fieldContainer: {
    width: "100%",
    textAlign: "left",
  },
}));

export default function StripeSettings() {
  const classes = useStyles();
  const { getAll: getAllSettings, update } = useSettings();

  const [stripeSettings, setStripeSettings] = useState({
    stripePublicKey: '',
    stripeSecretKey: ''
  });

  useEffect(async () => {
    // Carregar as configurações iniciais do Stripe

    const loadInitialSettings = (settings) => {
      const initialSettings = settings.reduce((acc, setting) => {
        if (setting.key.startsWith("_stripe")) {
          acc[setting.key.substring(1)] = setting.value;
        }
        return acc;
      }, {});
      setStripeSettings(initialSettings);
    };

    let settings = await getAllSettings();

    loadInitialSettings(settings);

  }, []);

  const handleSaveSetting = async (key, value) => {
    await update({
      key: `_${key}`,
      value
    });
    toast.success("Configuração do Stripe atualizada com sucesso.");
  };

  const handleChange = (key) => (event) => {
    const { value } = event.target;
    setStripeSettings(prev => ({ ...prev, [key]: value }));
    handleSaveSetting(key, value);
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6}>
        <FormControl className={classes.fieldContainer}>
          <TextField
            id="stripe-public-key-field"
            label="Stripe Public Key"
            variant="standard"
            value={stripeSettings.stripePublicKey || ""}
            onChange={handleChange('stripePublicKey')}
            onBlur={() => handleSaveSetting('stripePublicKey', stripeSettings.stripePublicKey)}
          />
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl className={classes.fieldContainer}>
          <TextField
            id="stripe-secret-key-field"
            label="Stripe Secret Key"
            variant="standard"
            value={stripeSettings.stripeSecretKey || ""}
            onChange={handleChange('stripeSecretKey')}
            onBlur={() => handleSaveSetting('stripeSecretKey', stripeSettings.stripeSecretKey)}
          />
        </FormControl>
      </Grid>
    </Grid>
  );
}