import React, {useEffect, useState, useContext} from "react";

import Grid from "@material-ui/core/Grid";
import {i18n} from "../../translate/i18n";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import Select from "@material-ui/core/Select";
import FormHelperText from "@material-ui/core/FormHelperText";
import TextField from "@material-ui/core/TextField";
import Title from "../Title";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import useSettings from "../../hooks/useSettings";
import {ToastContainer, toast} from 'react-toastify';
import {makeStyles} from "@material-ui/core/styles";
import {grey, blue} from "@material-ui/core/colors";
import {Tabs, Tab} from "@material-ui/core";

import OnlyForSuperUser from "../OnlyForSuperUser";
import useAuth from "../../hooks/useAuth.js";

import {Colorize} from "@material-ui/icons";
import ColorPicker from "../ColorPicker";
import ColorModeContext from "../../layout/themeContext";

const useStyles = makeStyles((theme) => ({
    container: {
        paddingTop: theme.spacing(4),
        paddingBottom: theme.spacing(4),
    },
    colorAdorment: {
        width: 20,
        height: 20,
    },
    uploadInput: {
        display: "none",
    },
    fixedHeightPaper: {
        padding: theme.spacing(2),
        display: "flex",
        overflow: "auto",
        flexDirection: "column",
        height: 240,
    },
    tab: {
        backgroundColor: theme.palette.options,
        borderRadius: 4,
        width: "100%",
        "& .MuiTab-wrapper": {
            color: theme.palette.fontecor,
        },
        "& .MuiTabs-flexContainer": {
            justifyContent: "center"
        }


    },
    paper: {
        padding: theme.spacing(2),
        display: "flex",
        alignItems: "center",
        marginBottom: 12,
        width: "100%",
    },
    cardAvatar: {
        fontSize: "55px",
        color: grey[500],
        backgroundColor: "#ffffff",
        width: theme.spacing(7),
        height: theme.spacing(7),
    },
    cardTitle: {
        fontSize: "18px",
        color: blue[700],
    },
    cardSubtitle: {
        color: grey[600],
        fontSize: "14px",
    },
    alignRight: {
        textAlign: "right",
    },
    fullWidth: {
        width: "100%",
    },
    selectContainer: {
        width: "100%",
        textAlign: "left",
    },
}));

export default function Options(props) {
    const {settings, scheduleTypeChanged} = props;
    const classes = useStyles();

    const [userRating, setUserRating] = useState("disabled");
    const [scheduleType, setScheduleType] = useState("disabled");
    const [callType, setCallType] = useState("enabled");
    const [chatbotType, setChatbotType] = useState("");
    const [allowSignup, setAllowSignup] = useState("disabled");
    const [CheckMsgIsGroup, setCheckMsgIsGroup] = useState("disabled");
    const [SendGreetingAccepted, setSendGreetingAccepted] = useState("disabled");
    const [SettingsTransfTicket, setSettingsTransfTicket] = useState("disabled");
    const [sendGreetingMessageOneQueues, setSendGreetingMessageOneQueues] = useState("enabled");

    const {getCurrentUserInfo} = useAuth();
    const [currentUser, setCurrentUser] = useState({});

    const [loadingUserRating, setLoadingUserRating] = useState(false);
    const [loadingScheduleType, setLoadingScheduleType] = useState(false);
    const [loadingCallType, setLoadingCallType] = useState(false);
    const [loadingAllowSignup, setLoadingAllowSignup] = useState(false);
    const [loadingChatbotType, setLoadingChatbotType] = useState(false);
    const [loadingCheckMsgIsGroup, setLoadingCheckMsgIsGroup] = useState(false);
    
    const [waSuportType, setWaSuportType] = useState("");
    const [loadingWaSuportType, setLoadingWaSuportType] = useState(false);
    const [msgSuportType, setMsgSuportType] = useState("");
    const [loadingMsgSuportType, setLoadingMsgSuportType] = useState(false);

  const [ipixcType, setIpIxcType] = useState("");
  const [loadingIpIxcType, setLoadingIpIxcType] = useState(false);
  const [tokenixcType, setTokenIxcType] = useState("");
  const [loadingTokenIxcType, setLoadingTokenIxcType] = useState(false);
  const [ipmkauthType, setIpMkauthType] = useState("");
  const [loadingIpMkauthType, setLoadingIpMkauthType] = useState(false);
  const [clientidmkauthType, setClientIdMkauthType] = useState("");
  const [loadingClientIdMkauthType, setLoadingClientIdMkauthType] = useState(false);
  const [clientsecretmkauthType, setClientSecrectMkauthType] = useState("");
  const [loadingClientSecrectMkauthType, setLoadingClientSecrectMkauthType] = useState(false);
  const [asaasType, setAsaasType] = useState("");
  const [loadingAsaasType, setLoadingAsaasType] = useState(false);
  const [loadingSendGreetingAccepted, setLoadingSendGreetingAccepted] = useState(false);
  const [loadingSettingsTransfTicket, setLoadingSettingsTransfTicket] = useState(false);
  const [loadingSendGreetingMessageOneQueues, setLoadingSendGreetingMessageOneQueues] = useState(false);

  const [callSuport, setCallSuport] = useState("enabled");
  const [loadingCallSuport, setLoadingCallSuport] = useState(false);
  const [trialExpiration, setTrialExpiration] = useState(false);
  const [loadingTrialExpiration, setLoadingTrialExpiration] = useState(false);
  const [displayContactInfo , setDisplayContactInfo ] = useState("disabled");
  const [loadingDisplayContactInfo, setLoadingDisplayContactInfo] = useState(false);


    //ATUALIZAÇÃO AA
    const [smtpauthType, setUrlSmtpauthType] = useState("");
    const [loadingUrlSmtpauthType, setLoadingUrlSmtpauthType] = useState(false);
    const [usersmtpauthType, setUserSmtpauthType] = useState("");
    const [loadingSmtpauthType, setLoadingSmptauthType] = useState(false);
    const [clientsecretsmtpauthType, setClientSecrectSmtpauthType] = useState("");
    const [loadingClientSecrectSmtpauthType, setLoadingClientSecrectSmtpauthType] = useState(false);
    const [smtpPortType, setSmtpPortType] = useState("");
    const [loadingSmtpPortType, setLoadingSmtpPortType] = useState(false)


    useState(false);

    const {update} = useSettings();

    useEffect(() => {
        getCurrentUserInfo().then(
            (u) => {
                setCurrentUser(u);
                console.log(u)
            }
        );
    }, []);

    useEffect(() => {
        if (Array.isArray(settings) && settings.length) {
            const userRating = settings.find((s) => s.key === "userRating");
            if (userRating) {
                setUserRating(userRating.value);
            }
            const scheduleType = settings.find((s) => s.key === "scheduleType");
            if (scheduleType) {
                setScheduleType(scheduleType.value);
            }
            const callType = settings.find((s) => s.key === "call");
            if (callType) {
                setCallType(callType.value);
            }
            const CheckMsgIsGroup = settings.find((s) => s.key === "CheckMsgIsGroup");
            if (CheckMsgIsGroup) {
                setCheckMsgIsGroup(CheckMsgIsGroup.value);
            }

            const SendGreetingAccepted = settings.find((s) => s.key === "sendGreetingAccepted");
            if (SendGreetingAccepted) {
                setSendGreetingAccepted(SendGreetingAccepted.value);
            }


            {/*TRANSFERIR TICKET*/
            }
            const SettingsTransfTicket = settings.find((s) => s.key === "sendMsgTransfTicket");
            if (SettingsTransfTicket) {
                setSettingsTransfTicket(SettingsTransfTicket.value);
            }
            {/*TRANSFERIR TICKET*/
            }

            const chatbotType = settings.find((s) => s.key === "chatBotType");
            if (chatbotType) {
                setChatbotType(chatbotType.value);
            }

            /// Botão para ativar/desativar registro
            const allowSignup = settings.find((s) => s.key === "allowSignup");
            if (allowSignup) {
              setAllowSignup(allowSignup.value);
            }

            const sendGreetingMessageOneQueues = settings.find((s) => s.key === "sendGreetingMessageOneQueues");
            if (sendGreetingMessageOneQueues) {
                setSendGreetingMessageOneQueues(sendGreetingMessageOneQueues.value)
            }

            const callSuport = settings.find((s) => s.key === "callSuport");
            if (callSuport) {
                setCallSuport(callSuport.value)
            }

            const displayContactInfo  = settings.find ((s) => s.key ==="displayContactInfo");
            if (displayContactInfo) {
                setDisplayContactInfo(displayContactInfo.value)
            }

            const trialExpiration = settings.find((s) => s.key === "trialExpiration");
            if (trialExpiration) {
                setTrialExpiration(trialExpiration.value)
            }

            const smtpauthType = settings.find((s) => s.key === "smtpauth");
            if (smtpauthType) {
                setUrlSmtpauthType(smtpauthType.value);
            }

            const usersmtpauthType = settings.find((s) => s.key === "usersmtpauth");
            if (usersmtpauthType) {
                setUserSmtpauthType(usersmtpauthType.value);
            }

            const clientsecretsmtpauthType = settings.find((s) => s.key === "clientsecretsmtpauth");
            if (clientsecretsmtpauthType) {
                setClientSecrectSmtpauthType(clientsecretsmtpauthType.value);
            }

            const smtpPortType = settings.find((s) => s.key === "smtpport");
            if (smtpPortType) {
                setSmtpPortType(smtpPortType.value);
            }

            const waSuportType = settings.find((s) => s.key === "wasuport");
                if (waSuportType) {
                    setWaSuportType(waSuportType.value);
                }

            const msgSuportType = settings.find((s) => s.key === "msgsuport");
                if (msgSuportType) {
                    setMsgSuportType(msgSuportType.value);
                }
                
            const ipixcType = settings.find((s) => s.key === "ipixc");
                if (ipixcType) {
                    setIpIxcType(ipixcType.value);
                }

            const tokenixcType = settings.find((s) => s.key === "tokenixc");
                if (tokenixcType) {
                    setTokenIxcType(tokenixcType.value);
                }

            const ipmkauthType = settings.find((s) => s.key === "ipmkauth");
                if (ipmkauthType) {
                    setIpMkauthType(ipmkauthType.value);
                }

            const clientidmkauthType = settings.find((s) => s.key === "clientidmkauth");
                if (clientidmkauthType) {
                    setClientIdMkauthType(clientidmkauthType.value);
                }

            const clientsecretmkauthType = settings.find((s) => s.key === "clientsecretmkauth");
                if (clientsecretmkauthType) {
                    setClientSecrectMkauthType(clientsecretmkauthType.value);
                }

            const asaasType = settings.find((s) => s.key === "asaas");
                if (asaasType) {
                    setAsaasType(asaasType.value);
                }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings]);
    
    async function handleChangeUserRating(value) {
        setUserRating(value);
        setLoadingUserRating(true);
        await update({
            key: "userRating",
            value,
        });
        toast.success("Operação atualizada com sucesso.");
        setLoadingUserRating(false);
    }

    async function handleScheduleType(value) {
        setScheduleType(value);
        setLoadingScheduleType(true);
        await update({
            key: "scheduleType",
            value,
        });
        toast.success('Operação atualizada com sucesso.', {
            position: "top-right",
            autoClose: 2000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: false,
            draggable: true,
            theme: "light",
        });
        setLoadingScheduleType(false);
        if (typeof scheduleTypeChanged === "function") {
            scheduleTypeChanged(value);
        }
    }

    async function handleCallType(value) {
        setCallType(value);
        setLoadingCallType(true);
        await update({
            key: "call",
            value,
        });
        toast.success("Operação atualizada com sucesso.");
        setLoadingCallType(false);
    }

    async function handleAllowSignup(value) {
        setAllowSignup(value);
        setLoadingAllowSignup(true);
        await update({
          key: "allowSignup",
          value,
        });
        toast.success("Operação atualizada com sucesso.");
        setLoadingAllowSignup(false);
      }

    async function handleChatbotType(value) {
        setChatbotType(value);
        setLoadingChatbotType(true);
        await update({
            key: "chatBotType",
            value,
        });
        toast.success("Operação atualizada com sucesso.");
        setLoadingChatbotType(false);
    }

    async function handleGroupType(value) {
        setCheckMsgIsGroup(value);
        setLoadingCheckMsgIsGroup(true);
        await update({
            key: "CheckMsgIsGroup",
            value,
        });
        toast.success("Operação atualizada com sucesso.");
        setLoadingCheckMsgIsGroup(false);
    }

    async function handleSendGreetingAccepted(value) {
        setSendGreetingAccepted(value);
        setLoadingSendGreetingAccepted(true);
        await update({
            key: "sendGreetingAccepted",
            value,
        });
        toast.success("Operação atualizada com sucesso.");
        setLoadingSendGreetingAccepted(false);
    }

    async function handleSettingsTransfTicket(value) {
        setSettingsTransfTicket(value);
        setLoadingSettingsTransfTicket(true);
        await update({
            key: "sendMsgTransfTicket",
            value,
        });

        toast.success("Operação atualizada com sucesso.");
        setLoadingSettingsTransfTicket(false);
    }

    async function handleChangeWaSuport(value) {
        setWaSuportType(value);
        setLoadingWaSuportType(true);
        await update({
          key: "wasuport",
          value,
        });
        toast.success("Operação atualizada com sucesso.");
        setLoadingWaSuportType(false);
      }
    
    async function handleChangeMsgSuport(value) {
        setMsgSuportType(value);
        setLoadingMsgSuportType(true);
        await update({
          key: "msgsuport",
          value,
        });
        toast.success("Operação atualizada com sucesso.");
        setLoadingMsgSuportType(false);
      }

    async function handleChangeIPIxc(value) {
    setIpIxcType(value);
    setLoadingIpIxcType(true);
    await update({
      key: "ipixc",
      value,
    });
    toast.success("Operação atualizada com sucesso.");
    setLoadingIpIxcType(false);
  }

    async function handleSendGreetingMessageOneQueues(value) {
        setSendGreetingMessageOneQueues(value);
        setLoadingSendGreetingMessageOneQueues(true);
        await update({
            key: "sendGreetingMessageOneQueues",
            value,
        });
        toast.success("Operação atualizada com sucesso.");
        setLoadingSendGreetingMessageOneQueues(false);
    }

    async function handleCallSuport(value) {
        setCallSuport(value);
        setLoadingCallSuport(true);
        await update({
            key: "callSuport",
            value,
        });
        toast.success("Operação atualizada com sucesso.");
        setLoadingCallSuport(false);
    }

    async function handleDisplayContactInfo(value) {
        setDisplayContactInfo (value);
        setLoadingDisplayContactInfo (true);
        await update({
            key: "displayContactInfo",
            value,
        });
        toast.success("Operação atualizada com sucesso.");
        setLoadingDisplayContactInfo(false);
    }

    async function handleTrialExpiration(value) {
        setTrialExpiration(value);
        setLoadingTrialExpiration(true);
        await update({
            key: "trialExpiration",
            value,
        });
        toast.success("Operação atualizada com sucesso.");
        setLoadingTrialExpiration(false);
    }

    async function handleChangeUrlSmtpauth(value) {
        setUrlSmtpauthType(value);
        setLoadingUrlSmtpauthType(true);
        await update({
            key: "smtpauth",
            value,
        });
        toast.success("Operação atualizada com sucesso.");
        setLoadingUrlSmtpauthType(false);
    }

    async function handleChangeUserSmptauth(value) {
        setUserSmtpauthType(value);
        setLoadingSmptauthType(true);
        await update({
            key: "usersmtpauth",
            value,
        });
        toast.success("Operação atualizada com sucesso.");
        setLoadingSmptauthType(false);
    }

    async function handleChangeClientSecrectSmtpauth(value) {
        setClientSecrectSmtpauthType(value);
        setLoadingClientSecrectSmtpauthType(true);
        await update({
            key: "clientsecretsmtpauth",
            value,
        });
        toast.success("Operação atualizada com sucesso.");
        setLoadingClientSecrectSmtpauthType(false);
    }
    
    async function handleChangeTokenIxc(value) {
    setTokenIxcType(value);
    setLoadingTokenIxcType(true);
    await update({
      key: "tokenixc",
      value,
    });
    toast.success("Operação atualizada com sucesso.");
    setLoadingTokenIxcType(false);
  }

  async function handleChangeIpMkauth(value) {
    setIpMkauthType(value);
    setLoadingIpMkauthType(true);
    await update({
      key: "ipmkauth",
      value,
    });
    toast.success("Operação atualizada com sucesso.");
    setLoadingIpMkauthType(false);
  }

  async function handleChangeClientIdMkauth(value) {
    setClientIdMkauthType(value);
    setLoadingClientIdMkauthType(true);
    await update({
      key: "clientidmkauth",
      value,
    });
    toast.success("Operação atualizada com sucesso.");
    setLoadingClientIdMkauthType(false);
  }

  async function handleChangeClientSecrectMkauth(value) {
    setClientSecrectMkauthType(value);
    setLoadingClientSecrectMkauthType(true);
    await update({
      key: "clientsecretmkauth",
      value,
    });
    toast.success("Operação atualizada com sucesso.");
    setLoadingClientSecrectMkauthType(false);
  }

  async function handleChangeAsaas(value) {
    setAsaasType(value);
    setLoadingAsaasType(true);
    await update({
      key: "asaas",
      value,
    });
    toast.success("Operação atualizada com sucesso.");
    setLoadingAsaasType(false);
  }

    async function handleChangeSmtpPort(value) {
        setSmtpPortType(value);
        setLoadingSmtpPortType(true);
        await update({
            key: "smtpport",
            value,
        });
        toast.success("Operação atualizada com sucesso.");
        setLoadingSmtpPortType(false);
    }

    return (
        <>
            <Grid spacing={3} container>

            <OnlyForSuperUser
                    user={currentUser}
                    yes={() => (
                        <Grid xs={12} sm={6} md={4} item>
                        <FormControl className={classes.selectContainer}>
                            <InputLabel id="allowSignup-label">
                            Permitir cadastro
                            </InputLabel>
                            <Select
                            labelId="allowSignup-label"
                            value={allowSignup}
                            onChange={async (e) => {
                                handleAllowSignup(e.target.value);
                            }}
                            >
                            <MenuItem value={"disabled"}>Desativado</MenuItem>
                            <MenuItem value={"enabled"}>Ativado</MenuItem>
                            </Select>
                            <FormHelperText>
                            {loadingAllowSignup && "Atualizando..."}
                            </FormHelperText>
                        </FormControl>
                        </Grid>
                    )}
                    />                

                {/* ENVIAR SAUDAÇÃO AO ACEITAR O TICKET */}
                <Grid xs={12} sm={6} md={4} item>
                    <FormControl className={classes.selectContainer}>
                        <InputLabel id="sendGreetingAccepted-label">{i18n.t("optionsPage.sendanun")}</InputLabel>
                        <Select
                            label="sendGreetingAccepted-label"
                            value={SendGreetingAccepted}
                            onChange={async (e) => {
                                handleSendGreetingAccepted(e.target.value);
                            }}
                        >
                            <MenuItem value={"disabled"}>{i18n.t("optionsPage.buttons.off")}</MenuItem>
                            <MenuItem value={"enabled"}>{i18n.t("optionsPage.buttons.on")}</MenuItem>
                        </Select>
                        <FormHelperText>
                            {loadingSendGreetingAccepted && "Atualizando..."}
                        </FormHelperText>
                    </FormControl>
                </Grid>
                
                <Grid xs={12} sm={6} md={4} item>
                    <FormControl className={classes.selectContainer}>
                        <InputLabel id="ratings-label">{i18n.t("optionsPage.calif")}</InputLabel>
                        <Select
                            label="ratings-label"
                            value={userRating}
                            onChange={async (e) => {
                                handleChangeUserRating(e.target.value);
                            }}
                        >
                            <MenuItem value={"disabled"}>{i18n.t("optionsPage.buttons.offs")}</MenuItem>
                            <MenuItem value={"enabled"}>{i18n.t("optionsPage.buttons.ons")}</MenuItem>
                        </Select>
                        <FormHelperText>
                            {loadingUserRating && "Atualizando..."}
                        </FormHelperText>
                    </FormControl>
                </Grid>

                <Grid xs={12} sm={6} md={4} item>
                    <FormControl className={classes.selectContainer}>
                        <InputLabel id="schedule-type-label">
                            {i18n.t("optionsPage.expedient")}
                        </InputLabel>
                        <Select
                            label="schedule-type-label"
                            value={scheduleType}
                            onChange={async (e) => {
                                handleScheduleType(e.target.value);
                            }}
                        >
                            <MenuItem value={"disabled"}>{i18n.t("optionsPage.buttons.off")}</MenuItem>
                            <MenuItem value={"queue"}>{i18n.t("optionsPage.buttons.quee")}</MenuItem>
                            <MenuItem value={"company"}>{i18n.t("optionsPage.buttons.partner")}</MenuItem>
                        </Select>
                        <FormHelperText>
                            {loadingScheduleType && "Atualizando..."}
                        </FormHelperText>
                    </FormControl>
                </Grid>

                <Grid xs={12} sm={6} md={4} item>
                    <FormControl className={classes.selectContainer}>
                        <InputLabel id="group-type-label">
                            {i18n.t("optionsPage.ignore")}
                        </InputLabel>
                        <Select
                            label="group-type-label"
                            value={CheckMsgIsGroup}
                            onChange={async (e) => {
                                handleGroupType(e.target.value);
                            }}
                        >
                            <MenuItem value={"disabled"}>{i18n.t("optionsPage.buttons.off")}</MenuItem>
                            <MenuItem value={"enabled"}>{i18n.t("optionsPage.buttons.on")}</MenuItem>
                        </Select>
                        <FormHelperText>
                            {loadingCheckMsgIsGroup && "Atualizando..."}
                        </FormHelperText>
                    </FormControl>
                </Grid>

                <Grid xs={12} sm={6} md={4} item>
                    <FormControl className={classes.selectContainer}>
                        <InputLabel id="call-type-label">
                            {i18n.t("optionsPage.aceptcall")}
                        </InputLabel>
                        <Select
                            label="call-type-label"
                            value={callType}
                            onChange={async (e) => {
                                handleCallType(e.target.value);
                            }}
                        >
                            <MenuItem value={"disabled"}>{i18n.t("optionsPage.buttons.calldeny")}</MenuItem>
                            <MenuItem value={"enabled"}>{i18n.t("optionsPage.buttons.callok")}</MenuItem>
                        </Select>
                        <FormHelperText>
                            {loadingCallType && "Atualizando..."}
                        </FormHelperText>
                    </FormControl>
                </Grid>

                <Grid xs={12} sm={6} md={4} item>
                    <FormControl className={classes.selectContainer}>
                        <InputLabel id="chatbot-type-label">
                            {i18n.t("optionsPage.typechatbot")}
                        </InputLabel>
                        <Select
                            label="chatbot-type-label"
                            value={chatbotType}
                            onChange={async (e) => {
                                handleChatbotType(e.target.value);
                            }}
                        >
                            <MenuItem value={"text"}>Texto</MenuItem>
                            <MenuItem value={"list"}>Lista</MenuItem>
                        </Select>
                        <FormHelperText>
                            {loadingChatbotType && "Atualizando..."}
                        </FormHelperText>
                    </FormControl>
                </Grid>

                {/* ENVIAR MENSAGEM DE TRANSFERENCIA DE SETOR/ATENDENTE */}
                <Grid xs={12} sm={6} md={4} item>
                    <FormControl className={classes.selectContainer}>
                        <InputLabel id="sendMsgTransfTicket-label">{i18n.t("optionsPage.sendagent")}</InputLabel>
                        <Select
                            label="sendMsgTransfTicket-label"
                            value={SettingsTransfTicket}
                            onChange={async (e) => {
                                handleSettingsTransfTicket(e.target.value);
                            }}
                        >
                            <MenuItem value={"disabled"}>{i18n.t("optionsPage.buttons.off")}</MenuItem>
                            <MenuItem value={"enabled"}>{i18n.t("optionsPage.buttons.on")}</MenuItem>
                        </Select>
                        <FormHelperText>
                            {loadingSettingsTransfTicket && "Atualizando..."}
                        </FormHelperText>
                    </FormControl>
                </Grid>

                {/* ENVIAR SAUDAÇÃO QUANDO HOUVER SOMENTE 1 FILA */}
                <Grid xs={12} sm={6} md={4} item>
                    <FormControl className={classes.selectContainer}>
                        <InputLabel id="sendGreetingMessageOneQueues-label">
                            {i18n.t("optionsPage.greeatingOneQueue")}
                        </InputLabel>
                        <Select
                            label="sendGreetingMessageOneQueues-label"
                            value={sendGreetingMessageOneQueues}
                            onChange={async (e) => {
                                handleSendGreetingMessageOneQueues(e.target.value);
                            }}
                        >
                            <MenuItem value={"disabled"}>Desabilitado</MenuItem>
                            <MenuItem value={"enabled"}>Habilitado</MenuItem>
                        </Select>
                        <FormHelperText>
                            {loadingSendGreetingMessageOneQueues && "Atualizando..."}
                        </FormHelperText>
                    </FormControl>
                </Grid>            

                {/* Habilita botão de Suporte */}
                <OnlyForSuperUser
                    user={currentUser}
                    yes={() => (
                 <Grid xs={12} sm={6} md={4} item>
                    <FormControl className={classes.selectContainer}>
                        <InputLabel id="callSuport-label">
                            {i18n.t("optionsPage.callSuport")}
                        </InputLabel>
                        <Select
                            label="callSuport-label"
                            value={callSuport}
                            onChange={async (e) => {
                                handleCallSuport(e.target.value);
                            }}
                        >
                            <MenuItem value={"disabled"}>Desabilitado</MenuItem>
                            <MenuItem value={"enabled"}>Habilitado</MenuItem>
                        </Select>
                        <FormHelperText>
                            {loadingCallSuport && "Atualizando..."}
                        </FormHelperText>
                    </FormControl>
                </Grid>
                    )}
                />

                {/* Define dias para testes */}
                <OnlyForSuperUser
                    user={currentUser}
                    yes={() => (
                 <Grid xs={12} sm={6} md={4} item>
                    <FormControl className={classes.selectContainer}>
                        <InputLabel id="trialExpiration-label">
                            {i18n.t("optionsPage.trialExpiration")}
                        </InputLabel>
                        <Select
                            label="trialExpiration-label"
                            value={trialExpiration}
                            onChange={async (e) => {
                                handleTrialExpiration(e.target.value);
                            }}
                        >
                            <MenuItem value={"3"}>3</MenuItem>
                            <MenuItem value={"7"}>7</MenuItem>
                            <MenuItem value={"9"}>9</MenuItem>
                            <MenuItem value={"15"}>15</MenuItem>
                            <MenuItem value={"30"}>30</MenuItem>
                        </Select>
                        <FormHelperText>
                            {loadingTrialExpiration && "Atualizando..."}
                        </FormHelperText>
                    </FormControl>
                </Grid>
                    )}
                />

            <Grid xs={12} sm={6} md={4} item>
                <FormControl className={classes.selectContainer}>
                    <InputLabel id="displayContactInfo-label">
                        {i18n.t("optionsPage.displayContactInfo")}
                    </InputLabel>
                    <Select
                        label="displayContactInfo-label"
                        value={displayContactInfo}
                        onChange={async (e) => {
                            handleDisplayContactInfo(e.target.value);
                        }}
                    >
                        <MenuItem value={"disabled"}>Desabilitado</MenuItem>
                        <MenuItem value={"enabled"}>Habilitado</MenuItem>
                    </Select>
                    <FormHelperText>
                        {loadingDisplayContactInfo && "Atualizando..."}
                    </FormHelperText>
                </FormControl>
            </Grid>

            </Grid>

            <Grid spacing={3} container>
                <Tabs
                    value={1}
                    indicatorColor="primary"
                    textColor="primary"
                    scrollButtons="on"
                    variant="scrollable"
                    className={classes.tab}
                    style={{
                        marginBottom: 20,
                        marginTop: 20
                    }}
                >
                    <Tab
                        value={1}
                        label={i18n.t("optionsPage.advanced")}/>

                </Tabs>

            </Grid>

            {/*-----------------SUPORTE-----------------*/}
    {callSuport === "enabled" && (
        <OnlyForSuperUser
            user={currentUser}
            yes={() => (
            <Grid spacing={3} container
                  style={{marginBottom: 10}}>
                <Tabs
          indicatorColor="primary"
          textColor="primary"
          scrollButtons="on"
          variant="scrollable"
          className={classes.tab}
        >
          <Tab
            label="Suporte" />
        </Tabs>
        <Grid xs={12} sm={6} md={4} item>
          <FormControl className={classes.selectContainer}>
            <TextField
              id="wasuport"
              name="wasuport"
              margin="dense"
              label="WhatsApp do Suporte"
              variant="outlined"
              value={waSuportType}
              onChange={(e) => {
                if (e.target.value === '' || /^[0-9\b]+$/.test(e.target.value)) {
                  setWaSuportType(e.target.value);
                }
              }}
              onBlur={() => handleChangeWaSuport(waSuportType)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                e.target.blur();  // opcional, remove o foco do campo após pressionar Enter
                }
              }}
            >
            </TextField>
            <FormHelperText>
              {loadingWaSuportType && "Atualizando..."}
            </FormHelperText>
          </FormControl>
        </Grid>

        <Grid xs={12} sm={6} md={8} item>
          <FormControl className={classes.selectContainer}>
            <TextField
              id="msgsuporte"
              name="msgsuporte"
              margin="dense"
              label="Mensagem pré-definida"
              variant="outlined"
              value={msgSuportType}
              onChange={(e) => setMsgSuportType(e.target.value)}
              onBlur={() => handleChangeMsgSuport(msgSuportType)}
              onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.target.blur();
                }
            }}
            >
            </TextField>
            <FormHelperText>
              {loadingMsgSuportType && "Atualizando..."}
            </FormHelperText>
          </FormControl>
        </Grid>
            </Grid>
            )}
        />
    )}

      {/*-----------------IXC-----------------*/}
            <Grid spacing={3} container
                  style={{marginBottom: 10}}>
                <Tabs
          indicatorColor="primary"
          textColor="primary"
          scrollButtons="on"
          variant="scrollable"
          className={classes.tab}
        >
          <Tab
            label="IXC" />
        </Tabs>
        <Grid xs={12} sm={6} md={6} item>
          <FormControl className={classes.selectContainer}>
            <TextField
              id="ipixc"
              name="ipixc"
              margin="dense"
              label="IP do IXC"
              variant="outlined"
              value={ipixcType}
              onChange={async (e) => {
                handleChangeIPIxc(e.target.value);
              }}
            >
            </TextField>
            <FormHelperText>
              {loadingIpIxcType && "Atualizando..."}
            </FormHelperText>
          </FormControl>
        </Grid>
        <Grid xs={12} sm={6} md={6} item>
          <FormControl className={classes.selectContainer}>
            <TextField
              id="tokenixc"
              name="tokenixc"
              margin="dense"
              label="Token do IXC"
              variant="outlined"
              value={tokenixcType}
              onChange={async (e) => {
                handleChangeTokenIxc(e.target.value);
              }}
            >
            </TextField>
            <FormHelperText>
              {loadingTokenIxcType && "Atualizando..."}
            </FormHelperText>
          </FormControl>
        </Grid>
      </Grid>
      {/*-----------------MK-AUTH-----------------*/}
      <Grid spacing={3} container
        style={{ marginBottom: 10 }}>
        <Tabs
                    indicatorColor="primary"
                    textColor="primary"
                    scrollButtons="on"
                    variant="scrollable"
                    className={classes.tab}
                >
          <Tab label="MK-AUTH" />

                </Tabs>
        <Grid xs={12} sm={12} md={4} item>
                    <FormControl className={classes.selectContainer}>
                        <TextField
              id="ipmkauth"
              name="ipmkauth"
                            margin="dense"
              label="Ip Mk-Auth"
                            variant="outlined"
              value={ipmkauthType}
                            onChange={async (e) => {
                handleChangeIpMkauth(e.target.value);
                            }}
                        >
                        </TextField>
                        <FormHelperText>
              {loadingIpMkauthType && "Atualizando..."}
                        </FormHelperText>
                    </FormControl>
                </Grid>
        <Grid xs={12} sm={12} md={4} item>
                    <FormControl className={classes.selectContainer}>
                        <TextField
              id="clientidmkauth"
              name="clientidmkauth"
                            margin="dense"
              label="Client Id"
                            variant="outlined"
              value={clientidmkauthType}
                            onChange={async (e) => {
                handleChangeClientIdMkauth(e.target.value);
                            }}
                        >
                        </TextField>
                        <FormHelperText>
              {loadingClientIdMkauthType && "Atualizando..."}
                        </FormHelperText>
                    </FormControl>
                </Grid>
        <Grid xs={12} sm={12} md={4} item>
                    <FormControl className={classes.selectContainer}>
                        <TextField
              id="clientsecretmkauth"
              name="clientsecretmkauth"
                            margin="dense"
              label="Client Secret"
                            variant="outlined"
              value={clientsecretmkauthType}
                            onChange={async (e) => {
                handleChangeClientSecrectMkauth(e.target.value);
                            }}
                        >
                        </TextField>
                        <FormHelperText>
              {loadingClientSecrectMkauthType && "Atualizando..."}
                        </FormHelperText>
                    </FormControl>
                </Grid>
      </Grid>
      {/*-----------------ASAAS-----------------*/}
      <Grid spacing={3} container
        style={{ marginBottom: 10 }}>
        <Tabs
          indicatorColor="primary"
          textColor="primary"
          scrollButtons="on"
          variant="scrollable"
          className={classes.tab}
        >
          <Tab label="ASAAS" />
        </Tabs>
        <Grid xs={12} sm={12} md={12} item>
                    <FormControl className={classes.selectContainer}>
                        <TextField
              id="asaas"
              name="asaas"
                            margin="dense"
              label="Token Asaas"
                            variant="outlined"
              value={asaasType}
                            onChange={async (e) => {
                handleChangeAsaas(e.target.value);
                            }}
                        >
                        </TextField>
                        <FormHelperText>
              {loadingAsaasType && "Atualizando..."}
                        </FormHelperText>
                    </FormControl>
                </Grid>
            </Grid>
	                {/*-----------------SMTP-AUTH-----------------*/}
            <Grid spacing={3} container
                  style={{marginBottom: 10}}>
                <Tabs
                    value={1}
                    indicatorColor="primary"
                    textColor="primary"
                    scrollButtons="on"
                    variant="scrollable"
                    className={classes.tab}
                >
                    <Tab value={1} label="SMTP"/>

                </Tabs>
                <Grid xs={12} sm={12} md={3} item>
                    <FormControl className={classes.selectContainer}>
                        <TextField
                            id="smtpauth"
                            name="smtpauth"
                            margin="dense"
                            label="Url SMTP"
                            variant="outlined"
                            value={smtpauthType}
                            onChange={async (e) => {
                                handleChangeUrlSmtpauth(e.target.value);
                            }}
                        >
                        </TextField>
                        <FormHelperText>
                            {loadingUrlSmtpauthType && "Atualizando..."}
                        </FormHelperText>
                    </FormControl>
                </Grid>
                <Grid xs={12} sm={12} md={3} item>
                    <FormControl className={classes.selectContainer}>
                        <TextField
                            id="usersmtpauth"
                            name="usersmtpauth"
                            margin="dense"
                            label="User SMTP"
                            variant="outlined"
                            value={usersmtpauthType}
                            onChange={async (e) => {
                                handleChangeUserSmptauth(e.target.value);
                            }}
                        >
                        </TextField>
                        <FormHelperText>
                            {loadingSmtpauthType && "Atualizando..."}
                        </FormHelperText>
                    </FormControl>
                </Grid>
                <Grid xs={12} sm={12} md={3} item>
                    <FormControl className={classes.selectContainer}>
                        <TextField
                            id="clientsecretsmtpauth"
                            name="clientsecretsmtpauth"
                            margin="dense"
                            label="Password SMTP"
                            variant="outlined"
                            value={clientsecretsmtpauthType}
                            onChange={async (e) => {
                                handleChangeClientSecrectSmtpauth(e.target.value);
                            }}
                        >
                        </TextField>
                        <FormHelperText>
                            {loadingClientSecrectSmtpauthType && "Atualizando..."}
                        </FormHelperText>
                    </FormControl>
                </Grid>
                <Grid xs={12} sm={12} md={3} item>
                    <FormControl className={classes.selectContainer}>
                        <TextField
                            id="smtpport"
                            name="smtpport"
                            margin="dense"
                            label="Porta SMTP"
                            variant="outlined"
                            value={smtpPortType}
                            onChange={async (e) => {
                                handleChangeSmtpPort(e.target.value);
                            }}
                        >
                        </TextField>
                        <FormHelperText>
                            {loadingSmtpPortType && "Atualizando..."}
                        </FormHelperText>
                    </FormControl>
                </Grid>
            </Grid>
        </>
    );
}