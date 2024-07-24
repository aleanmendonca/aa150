import React, {useState, useEffect, useRef, useContext} from "react";
import {useHistory, useParams} from "react-router-dom";
import {parseISO, format, isSameDay} from "date-fns";
import clsx from "clsx";
import {makeStyles} from "@material-ui/core/styles";
import {green, grey, red, blue, orange} from "@material-ui/core/colors";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import Typography from "@material-ui/core/Typography";
import Avatar from "@material-ui/core/Avatar";
import Divider from "@material-ui/core/Divider";
import Badge from "@material-ui/core/Badge";
import Box from "@material-ui/core/Box";
import {i18n} from "../../translate/i18n";
import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import MarkdownWrapper from "../MarkdownWrapper";
import {Tooltip} from "@material-ui/core";
import {AuthContext} from "../../context/Auth/AuthContext";
import {TicketsContext} from "../../context/Tickets/TicketsContext";
import toastError from "../../errors/toastError";
import {v4 as uuidv4} from "uuid";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import InstagramIcon from "@material-ui/icons/Instagram";
import FacebookIcon from "@material-ui/icons/Facebook";
import GroupIcon from '@material-ui/icons/Group';
import AndroidIcon from "@material-ui/icons/Android";
import VisibilityIcon from "@material-ui/icons/Visibility";
import TicketMessagesDialog from "../TicketMessagesDialog";
import DoneIcon from '@material-ui/icons/Done';
import ClearOutlinedIcon from '@material-ui/icons/ClearOutlined';
import ThumbUpIcon from '@material-ui/icons/ThumbUp';
import ThumbUpAltOutlinedIcon from '@material-ui/icons/ThumbUpAltOutlined';
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';
import ConfirmationModal from "../ConfirmationModal";
import BlockOutlinedIcon from '@material-ui/icons/BlockOutlined';
import DeleteOutlineOutlinedIcon from '@material-ui/icons/DeleteOutlineOutlined';
import ThumbDownAltOutlinedIcon from '@material-ui/icons/ThumbDownAltOutlined';

const useStyles = makeStyles((theme) => ({
    ticket: {
        position: "relative",
        height: "83px",
        //paddingHorizontal: 10,
        //paddingVertical: 0
    },

    pendingTicket: {
        cursor: "unset",
    },

    noTicketsDiv: {
        display: "flex",
        height: "100px",
        margin: 40,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
    },

    noTicketsText: {
        textAlign: "center",
        color: "rgb(104, 121, 146)",
        fontSize: "14px",
        lineHeight: "1.4",
    },

    noTicketsTitle: {
        textAlign: "center",
        fontSize: "16px",
        fontWeight: "600",
        margin: "0px",
    },

    contactNameWrapper: {
        display: "flex",
        justifyContent: "space-between",
        top: -15
    },

    lastMessageTime: {
        justifySelf: "flex-end",
        textAlign: "right",
        position: "relative",
        top: -15
    },

    closedBadge: {
        alignSelf: "center",
        justifySelf: "flex-end",
        marginRight: 32,
        marginLeft: "auto",
    },

    contactLastMessage: {
        maxWidth: "72%",
        top: -15
    },

    newMessagesCount: {
        alignSelf: "center",
        marginRight: 0,
        marginLeft: "auto",
        top: -15
    },

    badgeStyle: {
        color: "white",
        backgroundColor: green[500],
        right: 20,
    },

    acceptButton: {
        position: "absolute",
        right: "108px",
    },

    ticketQueueColor: {
        flex: "none",
        width: "8px",
        height: "100%",
        position: "absolute",
        top: "0%",
        left: "0%",
    },

    ticketInfo: {
        position: "relative",
        top: 0
    },

    ticketInfo1: {
        position: "relative",
        width: "100%",
        flexDirection: "row",
        flexWrap: "wrap",
        display: "flex",
        top: 35,
        right: 0
    },
    Radiusdot: {
        display: "flex",
        marginBottom: 1,
        "& .MuiBadge-badge": {
            borderRadius: 2,
            position: "inherit",
            height: 16,
            margin: 2,
            padding: 3,
            fontSize: 10,
        },
        "& .MuiBadge-anchorOriginTopRightRectangle": {
            transform: "scale(1) translate(0%, -40%)",
        },

    },
    icon: {
        color: theme.palette.primary.main
    },

}));

const TicketListItemCustom = ({ticket, handleClose, setTabOpen}) => {
    const classes = useStyles();
    const history = useHistory();
    const [loading, setLoading] = useState(false);
    const [ticketUser, setTicketUser] = useState(null);
    const [tag, setTag] = useState(null);
    const [whatsAppName, setWhatsAppName] = useState(null);

    const [confirmationOpen, setConfirmationOpen] = useState(false);

    const [openTicketMessageDialog, setOpenTicketMessageDialog] = useState(false);
    const {ticketId} = useParams();
    const isMounted = useRef(true);
    const {setCurrentTicket} = useContext(TicketsContext);
    const {user} = useContext(AuthContext);
    const {profile, spy} = user;
    const [lastInteractionLabel, setLastInteractionLabel] = useState('');
    const intervalRef = useRef(null);
    const [displayContactInfo, setDisplayContactInfo] = useState('disabled');

    useEffect(async () => {
        try {
            const {data} = await api.get("/settings");
            const displayContactInfoSetting = data.find(setting => setting.key === "displayContactInfo");
            if (displayContactInfoSetting) {
                setDisplayContactInfo(displayContactInfoSetting.value);
            } else {
                console.warn("displayContactInfo setting not found");
            }
        } catch (error) {
            console.error("Erro ao buscar displayContactInfo:", error);
        }
    }, []);
    

    useEffect(() => {
        if (ticket.userId && ticket.user) {
            setTicketUser(ticket.user.name);
        }

        if (ticket.whatsappId && ticket.whatsapp) {
            setWhatsAppName(ticket.whatsapp.name);
        }

        setTag(ticket?.tags);

        return () => {
            isMounted.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
  useEffect(() => {
    const renderLastInteractionLabel = () => {
      let labelColor = '';
      let labelText = '';
      if (!ticket.lastMessage) return '';
      const lastInteractionDate = parseISO(ticket.updatedAt);
      const currentDate = new Date();
      const timeDifference = currentDate - lastInteractionDate;
      const hoursDifference = Math.floor(timeDifference / (1000 * 60 * 60));
      const minutesDifference = Math.floor(timeDifference / (1000 * 60));
      if (minutesDifference >= 3 && minutesDifference <= 10) {
        labelText = `(${minutesDifference} m atrás)`;
        labelColor = 'green';
      } else if (minutesDifference >= 30 && minutesDifference < 60) {
        labelText = `(${minutesDifference} m atrás)`;
        labelColor = 'Orange';
      } else if (minutesDifference > 60  && hoursDifference < 24) {
        labelText = `(${hoursDifference} h atrás)`;
        labelColor = 'red';
      } else if (hoursDifference >= 24) {
        labelText = `(${Math.floor(hoursDifference / 24)} dias atrás)`;
        labelColor = 'red';
      }
      return { labelText, labelColor };
    };
    const updateLastInteractionLabel = () => {
      const { labelText, labelColor } = renderLastInteractionLabel();
      setLastInteractionLabel(
        <Badge
          className={classes.lastInteractionLabel}
          style={{ color: labelColor }}
        >
          {labelText}
        </Badge>
      );
      setTimeout(updateLastInteractionLabel, 30 * 1000);
    };
    updateLastInteractionLabel();
  }, [ticket]); // Executando apenas uma vez ao montar o componente

    const handleCloseTicket = async (id) => {
        setLoading(true);
        try {
            await api.put(`/tickets/${id}`, {
                status: "closed",
                userId: user?.id,
                queueId: ticket?.queued?.id
            });
        } catch (err) {
            setLoading(false);
            toastError(err);
        }
        if (isMounted.current) {
            setLoading(false);
        }
        history.push(`/tickets/`);
    };

    const handleAcepptTicket = async (id) => {

        if (setTabOpen)
            setTabOpen("open");

        setLoading(true);
        try {
            await api.put(`/tickets/${id}`, {
                status: "open",
                userId: user?.id,
                queueId: ticket?.queue?.id
            });
        } catch (err) {
            setLoading(false);
            toastError(err);
        }
        if (isMounted.current) {
            setLoading(false);
        }
        history.push(`/tickets/${ticket.uuid}`);
    };

    const handleSelectTicket = (ticket) => {
        const code = uuidv4();
        const {id, uuid} = ticket;
        setCurrentTicket({id, uuid, code});
    };

    const handleOpenConfirmationModal = e => {
        setConfirmationOpen(true);
        if (handleClose)
            handleClose();
    };

    const handleDeleteTicket = async () => {
        try {
            await api.delete(`/tickets/${ticket.id}`);
        } catch (err) {
            toastError(err);
        }
    };

    const renderTicketInfo = () => {
        if (ticketUser) {
            return (
                <>
                    <Badge
                        className={classes.Radiusdot}   // User
                        badgeContent={`${ticketUser}`}
                        //color="primary"
                        style={{
                            backgroundColor: "#111B21",
                            height: 16,
                            padding: 4,
                            marginRight: 2,
                            position: "inherit",
                            borderRadius: 2,
                            color: "white",
                            top: -6,
                        }}
                    />
                    {ticket.whatsappId && (   // conexão
                        <Badge
                            className={classes.Radiusdot}
                            badgeContent={`${whatsAppName}`}
                            style={{
                                backgroundColor: "#7d79f2",
                                height: 16,
                                padding: 4,
                                marginRight: 2,
                                position: "inherit",
                                borderRadius: 2,
                                color: "white",
                                top: -6,
                            }}
                        />

                    )}
                    {ticket.queue?.name !== null && (   // sem fila
                        <Badge
                            className={classes.Radiusdot}
                            style={{
                                backgroundColor: ticket.queue?.color || "#7C7C7C",
                                height: 16,
                                padding: 4,
                                position: "inherit",
                                borderRadius: 2,
                                color: "white",
                                top: -6,
                                marginRight: 3,
                            }}
                            badgeContent={ticket.queue?.name || "Sem fila"}
                            //color="primary"
                        />
                    )}
                    {ticket.status === "open" && (   // Finalizar Atendimento
                        <Tooltip title="Finalizar Atendimento">
                            <CheckCircleOutlineIcon
                                onClick={() => handleCloseTicket(ticket.id)}
                                fontSize="small"
                                style={{
                                    color: green[700],
                                    cursor: "pointer",

                                    padding: 2,
                                    height: 23,
                                    width: 23,
                                    fontSize: 12,
                                    borderRadius: 50,
                                    position: 'absolute',
                                    right: 0,
                                    top: -30
                                }}
                            />
                        </Tooltip>
                    )}
                    {
                        ticket.tags?.map((tag) => {
                            return (
                                <Badge
                                    className={classes.Radiusdot}
                                    style={{
                                        backgroundColor: tag.color || "#7C7C7C",
                                        height: 16,
                                        padding: 4,
                                        position: "inherit",
                                        borderRadius: 2,
                                        color: "white",
                                        top: -6,
                                        marginRight: 3,
                                    }}
                                    badgeContent={tag.name.toUpperCase() || "TAG"}
                                    //color="primary"
                                />
                            );
                        })
                    }
                    {(profile === "admin" || spy == "enabled") && (   // Espiar Conversa
                        <Tooltip title="Espiar Conversa">
                            <VisibilityIcon
                                onClick={() => setOpenTicketMessageDialog(true)}
                                fontSize="small"
                                style={{
                                    color: blue[700],
                                    cursor: "pointer",

                                    padding: 2,
                                    height: 23,
                                    width: 23,
                                    fontSize: 12,
                                    borderRadius: 50,
                                    position: 'absolute',
                                    right: 28,
                                    top: -30
                                }}
                            />
                        </Tooltip>
                    )}
                    {ticket.chatbot && (
                        <Tooltip title="Chatbot">
                            <AndroidIcon
                                fontSize="small"
                                style={{color: grey[700], marginRight: 5}}
                            />
                        </Tooltip>
                    )}
                    {/* {ticket.channel === "whatsapp" && (
            <Tooltip title={`Atendente: ${ticketUser}`}>
              <WhatsAppIcon fontSize="small" style={{ color: grey[700] }} />
            </Tooltip>
          )}
          {ticket.channel === "instagram" && (
            <Tooltip title={`Atendente: ${ticketUser}`}>
              <InstagramIcon fontSize="small" style={{ color: grey[700] }} />
            </Tooltip>
          )}
          {ticket.channel === "facebook" && (
            <Tooltip title={`Atendente: ${ticketUser}`}>
              <FacebookIcon fontSize="small" style={{ color: grey[700] }} />
            </Tooltip>
          )} */}
                </>
            );
        } else {
            return (
                <>

                    {ticket.whatsappId && (   // conexão
                        <Badge
                            className={classes.Radiusdot}
                            badgeContent={`${whatsAppName}`}
                            style={{
                                backgroundColor: "#7d79f2",
                                height: 16,
                                padding: 4,
                                marginRight: 2,
                                position: "inherit",
                                borderRadius: 2,
                                color: "white",
                                top: -6,
                            }}
                        />

                    )}
                    {ticket.queue?.name !== null && (   // sem fila
                        <Badge
                            className={classes.Radiusdot}
                            style={{
                                backgroundColor: ticket.queue?.color || "#7C7C7C",
                                height: 16,
                                padding: 4,
                                position: "inherit",
                                borderRadius: 2,
                                color: "white",
                                top: -6,
                                marginRight: 3,
                            }}
                            badgeContent={ticket.queue?.name || "Sem fila"}

                        />
                    )}
                    {(profile === "admin" || spy == "enabled") && (   // Espiar Conversa
                        <Tooltip title="Espiar Conversa">
                            <VisibilityIcon
                                onClick={() => setOpenTicketMessageDialog(true)}
                                fontSize="small"
                                style={{
                                    color: blue[700],
                                    cursor: "pointer",

                                    padding: 2,
                                    height: 23,
                                    width: 23,
                                    fontSize: 12,
                                    borderRadius: 50,
                                    position: 'absolute',
                                    right: 75,
                                    top: -30
                                }}
                            />
                        </Tooltip>
                    )}
                    {ticket.status === "pending" && (   // Iniciar Atendimento
                        <Tooltip title="Iniciar Atendimento">
                            <ThumbUpAltOutlinedIcon
                                onClick={() => handleAcepptTicket(ticket.id)}
                                fontSize="small"
                                style={{
                                    color: green[700],
                                    cursor: "pointer",

                                    padding: 2,
                                    height: 23,
                                    width: 23,
                                    fontSize: 12,
                                    borderRadius: 50,
                                    position: 'absolute',
                                    right: 50,
                                    top: -30
                                }}
                            />
                        </Tooltip>
                    )}
                    {ticket.status === "open" && (  // Finalizar Atendimento
                        <Tooltip title="Finalizar Atendimento">
                            <CheckCircleOutlineIcon
                                onClick={() => handleCloseTicket(ticket.id)}
                                fontSize="small"
                                style={{
                                    color: green[700],
                                    cursor: "pointer",

                                    padding: 2,
                                    height: 23,
                                    width: 23,
                                    fontSize: 12,
                                    borderRadius: 50,
                                    position: 'absolute',
                                    right: 49,
                                    top: -30
                                }}
                            />
                        </Tooltip>
                    )}
                    {profile === "admin" && (   // Recusar Atendimento
                        <Tooltip title="Recusar Atendimento">
                            <ThumbDownAltOutlinedIcon
                                onClick={() => handleCloseTicket(ticket.id)}
                                fontSize="small"
                                style={{
                                    color: orange[700],
                                    cursor: "pointer",

                                    padding: 2,
                                    height: 23,
                                    width: 23,
                                    fontSize: 12,
                                    borderRadius: 50,
                                    position: 'absolute',
                                    right: 25,
                                    top: -30
                                }}
                            />
                        </Tooltip>
                    )}
                    {profile === "admin" && (   // Deletar Entrada
                        <Tooltip title="Deletar Entrada">
                            <DeleteOutlineOutlinedIcon
                                perform="ticket-options:deleteTicket"
                                onClick={() => handleOpenConfirmationModal(ticket.id)}
                                fontSize="small"
                                style={{
                                    color: red[700],
                                    cursor: "pointer",

                                    padding: 2,
                                    height: 23,
                                    width: 23,
                                    fontSize: 12,
                                    borderRadius: 50,
                                    position: 'absolute',
                                    right: 0,
                                    top: -30
                                }}
                            />
                        </Tooltip>
                    )}
                    {ticket.chatbot && (
                        <Tooltip title="Chatbot">
                            <AndroidIcon
                                fontSize="small"
                                style={{color: grey[700], marginRight: 5}}
                            />
                        </Tooltip>
                    )}

                    <ConfirmationModal
                        title={`${i18n.t("ticketOptionsMenu.confirmationModal.title")}${
                            ticket.id
                        } ${i18n.t("ticketOptionsMenu.confirmationModal.titleFrom")} ${
                            ticket.contact?.name
                        }?`}
                        open={confirmationOpen}
                        onClose={setConfirmationOpen}
                        onConfirm={handleDeleteTicket}
                    >
                        {i18n.t("ticketOptionsMenu.confirmationModal.message")}
                    </ConfirmationModal>
                </>
            );
        }
    };

    return (
        <React.Fragment key={ticket.id}>
            <TicketMessagesDialog
                open={openTicketMessageDialog}
                handleClose={() => setOpenTicketMessageDialog(false)}
                ticketId={ticket.id}
            ></TicketMessagesDialog>
            <ListItem
                dense
                button
                onClick={(e) => {
                    if (ticket.status === "pending") return;
                    handleSelectTicket(ticket);
                }}
                selected={ticketId && +ticketId === ticket.id}
                className={clsx(classes.ticket, {
                    [classes.pendingTicket]: ticket.status === "pending",
                })}
            >
                <Tooltip
                    arrow
                    placement="right"
                    title={ticket.queue?.name || "Sem fila"}
                >
              <span
                  style={{backgroundColor: ticket.queue?.color || "#7C7C7C"}}
                  className={classes.ticketQueueColor}
              ></span>
                </Tooltip>
                <ListItemAvatar>
                    <Avatar src={ticket?.contact?.profilePicUrl}/>
                </ListItemAvatar>
                <ListItemText style={{top: -15}}
                              disableTypography
                              primary={
                                  <span className={classes.contactNameWrapper} style={{top: -15}}>
                    <Typography
                        noWrap
                        component="span"
                        variant="body2"
                        color="textPrimary"
                    >
                        {ticket.channel === "whatsapp" && (
                            <Tooltip title={`${ticket.channel} - Atendente: ${ticketUser}`} style={{top: -15}}>
                                <WhatsAppIcon fontSize="small" style={{top: -15, color: "#30D24E"}}/>
                            </Tooltip>
                        )}
                        {ticket.channel === "instagram" && (
                            <Tooltip title={`${ticket.channel} - Atendente: ${ticketUser}`} style={{top: -15}}>
                                <InstagramIcon fontSize="small" style={{top: -15, color: "#F60078"}}/>
                            </Tooltip>
                        )}
                        {ticket.channel === "facebook" && (
                            <Tooltip title={`${ticket.channel} - Atendente: ${ticketUser}`} style={{top: -15}}>
                                <FacebookIcon fontSize="small" style={{top: -15, color: "#4867AA"}}/>
                            </Tooltip>
                        )}{' '}
                <Typography
                  noWrap
                  component='span'
                  variant='body2'
                  color='textPrimary'
                >
                  <strong>{displayContactInfo === 'enabled' ? ticket.contact?.number : ticket.contact?.name} {lastInteractionLabel}</strong>
                </Typography>
                    </Typography>
                    <ListItemSecondaryAction style={{left: 73}}>
                        <Box className={classes.ticketInfo1}>{renderTicketInfo()}</Box>
                    </ListItemSecondaryAction>
                </span>
                              }
                              secondary={
                                  <span className={classes.contactNameWrapper} style={{top: -15}}>
                  <Typography
                      className={classes.contactLastMessage} style={{top: -15}}
                      noWrap
                      component="span"
                      variant="body2"
                      color="textSecondary"
                      >
                      {ticket.contact?.presence !== "available" ? (
                        <>
                          {ticket.contact ? i18n.t(`presence.${ticket.contact.presence}`) : ""}
                        </>
                      ) : (
                        <>
                          {ticket.lastMessage?.includes('data:image/png;base64') ? <MarkdownWrapper> Localização</MarkdownWrapper> : <MarkdownWrapper>{ticket.lastMessage}</MarkdownWrapper>}
                        </>
                      )}
                  </Typography>
                </span>

                              }
                />
                <ListItemSecondaryAction>
                    {ticket.status === "closed" && (  // FINALIZADOS
                        <Badge
                            className={classes.Radiusdot}
                            badgeContent={"FECHADO"}
                            style={{

                                backgroundColor: ticket.queue?.color || "#ff0000",
                                height: 16,
                                padding: 4,
                                borderRadius: 2,
                                color: "white",
                                top: -15
                            }}
                        />
                    )}

                    {ticket.lastMessage && (
                        <>
                            <Badge
                                className={classes.newMessagesCount}
                                badgeContent={ticket.unreadMessages ? ticket.unreadMessages : null}
                                classes={{
                                    badge: classes.badgeStyle,
                                }}
                            />
                            <Typography
                                className={classes.lastMessageTime} style={{top: -15}}
                                component="span"
                                variant="body2"
                                color="textSecondary"
                            >
                                {isSameDay(parseISO(ticket.updatedAt), new Date()) ? (
                                    <>{format(parseISO(ticket.updatedAt), "HH:mm")}</>
                                ) : (
                                    <>{format(parseISO(ticket.updatedAt), "dd/MM/yyyy")}</>
                                )}
                            </Typography>
                            <br/>
                        </>
                    )}
                </ListItemSecondaryAction>
            </ListItem>
            <Divider variant="inset" component="li"/>
        </React.Fragment>
    );
};

export default TicketListItemCustom;
