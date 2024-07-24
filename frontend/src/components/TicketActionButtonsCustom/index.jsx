import React, {useContext, useState, useRef, useEffect} from "react";
import { useHistory } from "react-router-dom";
import { Can } from "../Can";

import { makeStyles, createTheme, ThemeProvider } from "@material-ui/core/styles";
import { IconButton } from "@material-ui/core";
import { MoreVert, Replay, KeyboardReturn, PictureAsPdf, Event, DeleteOutlineOutlined, SyncAlt } from "@material-ui/icons";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import TicketOptionsMenu from "../TicketOptionsMenu";
import ButtonWithSpinner from "../ButtonWithSpinner";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { TicketsContext } from "../../context/Tickets/TicketsContext";
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import UndoRoundedIcon from '@material-ui/icons/UndoRounded';
import Tooltip from '@material-ui/core/Tooltip';
import { green } from '@material-ui/core/colors';
import { BiSend, BiTransfer } from 'react-icons/bi';

import TransferTicketModalCustom from "../TransferTicketModalCustom";
import ScheduleModal from "../ScheduleModal";
import ConfirmationModal from "../ConfirmationModal";
import usePlans from "../../hooks/usePlans";
import ShowTicketLogModal from "../ShowTicketLogModal";
import TicketMessagesDialog from "../TicketMessagesDialog";
import TicketMessagesExportDialog from "../TicketMessagesExportDialog";


const useStyles = makeStyles(theme => ({
	actionButtons: {
		marginRight: 6,
		[theme.breakpoints.down("md")]: {
			marginRight: 0,
		},

		flex: "none",
		alignSelf: "center",
		marginLeft: "auto",
		"& > *": {
			margin: theme.spacing(0.5),
		},
	},
}));

const TicketActionButtonsCustom = ({ 
	ticket, 
	showSelectMessageCheckbox, 
	selectedMessages, 
	forwardMessageModalOpen,
	setForwardMessageModalOpen 
 }) => {
	const classes = useStyles();
	const history = useHistory();
	const isMounted = useRef(true);
	const [anchorEl, setAnchorEl] = useState(null);
	const [loading, setLoading] = useState(false);
	const ticketOptionsMenuOpen = Boolean(anchorEl);
	const { user } = useContext(AuthContext);
	const { setCurrentTicket } = useContext(TicketsContext);	
	const [confirmationOpen, setConfirmationOpen] = useState(false);
	const [transferTicketModalOpen, setTransferTicketModalOpen] = useState(false);
	const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
	const [contactId, setContactId] = useState(null);
	const [open, setOpen] = React.useState(false);
	const [openTicketMessageDialog, setOpenTicketMessageDialog] = useState(false);
	const [showSchedules, setShowSchedules] = useState(false);
	const [showTicketLogOpen, setShowTicketLogOpen] = useState(false);
	const { getPlanCompany } = usePlans();


	useEffect(async () => {
		async function fetchData() {
			const companyId = user.companyId;
			const planConfigs = await getPlanCompany(undefined, companyId);
			setShowSchedules(planConfigs.plan.useSchedules);
			setOpenTicketMessageDialog(false);
		}

		await fetchData();
		setShowTicketLogOpen(false)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const customTheme = createTheme({
		palette: {
		  	primary: green,
		}
	});

	const handleOpenTicketOptionsMenu = e => {
		setAnchorEl(e.currentTarget);
	};

	const handleCloseTicketOptionsMenu = e => {
		setAnchorEl(null);
	};

	const handleClose = () => {
		//formRef.current.resetForm();
		setOpen(false);
	  };

	const handleOpenScheduleModal = () => {
		if (typeof handleClose == "function") handleClose();
		setContactId(ticket.contact.id);
		setScheduleModalOpen(true);
	  };
	
	  const handleCloseScheduleModal = () => {
		setScheduleModalOpen(false);
		setContactId(null);
	  };

	  const handleOpenTransferModal = (e) => {
		setTransferTicketModalOpen(true);
		if (typeof handleClose == "function") handleClose();
	  };

	  const handleCloseTransferTicketModal = () => {
		if (isMounted.current) {
		  setTransferTicketModalOpen(false);
		}
	  };

	  const handleOpenConfirmationModal = (e) => {
		setConfirmationOpen(true);
		if (typeof handleClose == "function") handleClose();
	  };

	  const handleDeleteTicket = async () => {
		try {
		  await api.delete(`/tickets/${ticket.id}`);
		} catch (err) {
		  toastError(err);
		}
	  };

	const handleOpenModalForward = () => {
		if (selectedMessages.length === 0) {
			toastError({response: {data: {message: "Nenhuma mensagem selecionada"}}});
			return;
		}
		setForwardMessageModalOpen(true);
	}

	const handleUpdateTicketStatus = async (e, status, userId) => {
		setLoading(true);
		try {
			await api.put(`/tickets/${ticket.id}`, {
				status: status,
				userId: userId || null,
				useIntegration: status === "closed" ? false : ticket.useIntegration,
				promptId: status === "closed" ? false : ticket.promptId,
				integrationId: status === "closed" ? false : ticket.integrationId
			});

			setLoading(false);
			if (status === "open") {
				setCurrentTicket({ ...ticket, code: "#open" });
			} else {
				setCurrentTicket({ id: null, code: null })
				history.push("/tickets");
			}
		} catch (err) {
			setLoading(false);
			toastError(err);
		}
	};

	return (
		<>

			{openTicketMessageDialog && (
				<TicketMessagesExportDialog
					open={openTicketMessageDialog}
					handleClose={() => setOpenTicketMessageDialog(false)}
					ticketId={ticket.id}
				/>
			)}
		<div className={classes.actionButtons}>
			<IconButton
				className={classes.bottomButtonVisibilityIcon}
				onClick={() => setOpenTicketMessageDialog(true)}
			>
				<Tooltip title={i18n.t("ticketsList.buttons.exportAsPdf")}>
					<PictureAsPdf />

				</Tooltip>
			</IconButton>

			{ticket.status === "closed" && (
				<ButtonWithSpinner
					loading={loading}
					startIcon={<Replay />}
					size="small"
					onClick={e => handleUpdateTicketStatus(e, "open", user?.id)}
				>
					{i18n.t("messagesList.header.buttons.reopen")}
				</ButtonWithSpinner>
			)}

			{(ticket.status === "open" || ticket.status === "group") && (
				<>
				{!showSelectMessageCheckbox ? (
					<>
					<Tooltip title={i18n.t("messagesList.header.buttons.return")}>
						<IconButton className={'p-sm-0'} onClick={e => handleUpdateTicketStatus(e, "pending", null)}>
							<KeyboardReturn />
						</IconButton>
					</Tooltip>
					<ThemeProvider theme={customTheme}>
						<Tooltip title={i18n.t("messagesList.header.buttons.resolve")}>
							<IconButton className={'p-sm-0'} onClick={e => handleUpdateTicketStatus(e, "closed", user?.id)} color="primary">
								<CheckCircleIcon />
							</IconButton>
						</Tooltip>
					</ThemeProvider>

						<IconButton className={classes.bottomButtonVisibilityIcon + ' p-sm-0'}  >
              <Tooltip title="Transferir Atendimento">
                <SyncAlt
                  color="primary"
                  onClick={handleOpenTransferModal}
                />
              </Tooltip>
            </IconButton>

			<IconButton className={classes.bottomButtonVisibilityIcon+ ' p-sm-0'}>
                  <Tooltip title="Agendamento">
                    <Event
                      color="primary"
                      onClick={handleOpenScheduleModal}
                    />
                  </Tooltip>
                </IconButton>

				<Can
              role={user.profile}
              perform="ticket-options:deleteTicket"
              yes={() => (
                <IconButton className={classes.bottomButtonVisibilityIcon + ' p-sm-0'}  >
                  <Tooltip title="Deletar Ticket">
                    <DeleteOutlineOutlined
                      style={{ color: "red" }}
                      onClick={handleOpenConfirmationModal}
                    />
                  </Tooltip>
                </IconButton>
              )}
            />

					</>) : (
					<ButtonWithSpinner
						loading={loading}
						startIcon={<BiSend />}
						size="small"
						onClick={handleOpenModalForward}
					>
						{i18n.t("messageOptionsMenu.forwardbutton")}
					</ButtonWithSpinner>
				)}
				</>
			)}

			<ConfirmationModal
              title={`${i18n.t("ticketOptionsMenu.confirmationModal.title")} #${
                ticket.id
              }?`}
              open={confirmationOpen}
              onClose={setConfirmationOpen}
              onConfirm={handleDeleteTicket}
            >
              {i18n.t("ticketOptionsMenu.confirmationModal.message")}
            </ConfirmationModal>
            <TransferTicketModalCustom
              modalOpen={transferTicketModalOpen}
              onClose={handleCloseTransferTicketModal}
              ticketid={ticket.id}
            />
            <ScheduleModal
              open={scheduleModalOpen}
              onClose={handleCloseScheduleModal}
              aria-labelledby="form-dialog-title"
              contactId={contactId}
            />
			{ticket.status === "pending" && (
				<ButtonWithSpinner
					loading={loading}
					size="small"
					variant="contained"
					color="primary"
					onClick={e => handleUpdateTicketStatus(e, "open", user?.id)}
				>
					{i18n.t("messagesList.header.buttons.accept")}
				</ButtonWithSpinner>
			)}
		</div>
		</>
	);
};

export default TicketActionButtonsCustom;