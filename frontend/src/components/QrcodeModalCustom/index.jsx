import React, { useEffect, useState, useContext } from "react";
import QRCode from "qrcode.react";
import toastError from "../../errors/toastError";

import { Dialog, DialogContent, Grid, Paper, Typography } from "@material-ui/core";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import { SocketContext } from "../../context/Socket/SocketContext";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import SettingsIcon from "@material-ui/icons/Settings";

const QrcodeModal = ({ open, onClose, whatsAppId }) => {
  const [qrCode, setQrCode] = useState("");

  const socketManager = useContext(SocketContext);

  useEffect(() => {
    const fetchSession = async () => {
      if (!whatsAppId) return;

      try {
        const { data } = await api.get(`/whatsapp/${whatsAppId}`);
        setQrCode(data.qrcode);
      } catch (err) {
        toastError(err);
      }
    };
    fetchSession();
  }, [whatsAppId]);

  useEffect(() => {
    if (!whatsAppId) return;
    const companyId = localStorage.getItem("companyId");
    const socket = socketManager.GetSocket(companyId);

    const onCompanyWhatsappSession = (data) => {
      if (data.action === "update" && data.session.id === whatsAppId) {
        setQrCode(data.session.qrcode);
      }

      if (data.action === "update" && data.session.qrcode === "") {
        onClose();
      }
    }

    socket.on(`company-${companyId}-whatsappSession`, onCompanyWhatsappSession);

    return () => {
      socket.off(`company-${companyId}-whatsappSession`, onCompanyWhatsappSession);

    };
  }, [whatsAppId, onClose, socketManager]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" scroll="paper">
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="h6" gutterBottom>
            {i18n.t("qrCode.title")}
            </Typography>
            <Typography variant="body1" gutterBottom>
              1 - {i18n.t("qrCode.firstline")}
            </Typography>
            <Typography variant="body1" gutterBottom>
              2 - {i18n.t("qrCode.secondline.touch")} <MoreVertIcon /> {i18n.t("qrCode.secondline.orsetting")} <SettingsIcon /> {i18n.t("qrCode.secondline.iphone")}
            </Typography>
            <Typography variant="body1" gutterBottom>
              3 - {i18n.t("qrCode.thirdline")}
            </Typography>
            <Typography variant="body1" gutterBottom>
              4 - {i18n.t("qrCode.fourthline")}
            </Typography>
          </Grid>
          <Grid item xs={6} container justify="center" alignItems="center">
            <Paper elevation={0}>
              {qrCode ? (
                <QRCode value={qrCode} size={256} />
              ) : (
                <Typography>Waiting for QR Code</Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
};

export default React.memo(QrcodeModal);