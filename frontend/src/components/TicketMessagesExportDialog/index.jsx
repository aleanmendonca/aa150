import React, { useCallback, useContext, useEffect, useState } from "react";


import toastError from "../../errors/toastError";

import {

  Button,
  Dialog,
  DialogActions,
  makeStyles,
} from "@material-ui/core";


import html2pdf from "html3pdf";
import { jsPDF } from "jspdf";


export default function TicketMessagesExportDialog({ open, handleClose, ticketId }) {



  const [exportedToPDF, setExportedToPDF] = useState(false);

  
  const handleExportToPDF = () => {
    const messagesListElement = document.getElementById("messagesList"); // Id do elemento que você deseja exportar para PDF
    const headerElement = document.getElementById("TicketHeader"); // Id do elemento de cabeçalho que você deseja exportar
    const drawerContainer = document.getElementById("drawer-container"); // Id do elemento de cabeçalho que você deseja exportar

    const pdfOPtions = {
      margin: 0,
      filename: `relatório_atendimento_${ticketId}.pdf`,
      image: { type: 'jpeg', quality: 0.7 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
    };

    if (messagesListElement) {
      const headerClone = headerElement.cloneNode(true);
      const messagesListClone = messagesListElement.cloneNode(true);

      const containerElement = document.createElement("div");
      containerElement.appendChild(headerClone); // Adicione o elemento do cabeçalho
      containerElement.appendChild(messagesListClone);
      html2pdf()
        .from(containerElement)
        .set(pdfOPtions)
        .save();
    } else {
      toastError("Elemento não encontrado para exportar.");
    }
  };

  const handleExportAndClose = () => {
    if (!exportedToPDF) {
      handleExportToPDF();
      setExportedToPDF(true);
      handleClose(); // Fecha o Dialog
    }
  };

  useEffect(() => {
    if (open) {
      // Execute a exportação para PDF e feche o Dialog
      handleExportAndClose();
    }
  }, [open, ticketId, handleExportAndClose]);


  return (
    <Dialog maxWidth="md" onClose={handleClose} open={open}>
      <DialogActions>
        <Button onClick={handleExportToPDF} color="primary">
          Exportar para PDF
        </Button>
        <Button onClick={handleClose} color="primary">
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
