import React, {useEffect, useState, useContext, useRef} from "react";

import Grid from "@material-ui/core/Grid";
import FormControl from "@material-ui/core/FormControl";
import TextField from "@material-ui/core/TextField";
import useSettings from "../../hooks/useSettings";
import {toast} from 'react-toastify';
import {makeStyles} from "@material-ui/core/styles";
import {grey, blue} from "@material-ui/core/colors";
import OnlyForSuperUser from "../OnlyForSuperUser";
import useAuth from "../../hooks/useAuth.js";

import {
    IconButton,
    InputAdornment,
} from "@material-ui/core";

import {Colorize, AttachFile, Delete} from "@material-ui/icons";
import ColorModeContext from "../../layout/themeContext";
import api from "../../services/api";

const defaultLogoLight = "assets/vector/logo.svg";
const defaultLogoDark = "assets/vector/logo-dark.svg";
const defaultLogoFavicon = "assets/vector/favicon.svg";

const useStyles = makeStyles((theme) => ({
    container: {
        paddingTop: theme.spacing(4),
        paddingBottom: theme.spacing(4),
    },

    fixedHeightPaper: {
        padding: theme.spacing(2),
        display: "flex",
        overflow: "auto",
        flexDirection: "column",
        height: 240,
    },
    tab: {
        borderRadius: 4,
        width: "100%",
        "& .MuiTab-wrapper": {
            color: "#128c7e"
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
    colorAdorment: {
        width: 20,
        height: 20,
    },

    uploadInput: {
        display: "none",
    },

    appLogoLightPreviewDiv: {
        backgroundColor: "white",
        padding: "10px",
        borderStyle: "solid",
        borderWidth: "1px",
        borderColor: "#424242",
    },

    appLogoDarkPreviewDiv: {
        backgroundColor: "#424242",
        padding: "10px",
        borderStyle: "solid",
        borderWidth: "1px",
        borderColor: "white",
    },

    appLogoLightPreviewImg: {
        width: "100%",
        maxHeight: 72,
        content: "url(" + theme.calculatedLogoLight() + ")"
    },

    appLogoDarkPreviewImg: {
        width: "100%",
        maxHeight: 72,
        content: "url(" + theme.calculatedLogoDark() + ")"
    },

    appLogoFaviconPreviewDiv: {
        padding: "10px",
        borderStyle: "solid",
        borderWidth: "1px",
        borderColor: "black",
    },

    appLogoFaviconPreviewImg: {
        width: "100%",
        maxHeight: 72,
        content: "url(" + ((theme.appLogoFavicon) ? theme.appLogoFavicon : "") + ")"
    },

    title: {
        textAlign: "center",
        fontSize: "18px",
        fontWeight: "bold",
        color: grey[600]
    }
}));

export default function Whitelabel(props) {
    const {settings} = props;
    const classes = useStyles();
    const {colorMode} = useContext(ColorModeContext);
    const [settingsLoaded, setSettingsLoaded] = useState({});

    const {getCurrentUserInfo} = useAuth();
    const [currentUser, setCurrentUser] = useState({}); 
    const [boxLeftLightModalOpen, setBoxLeftLightModalOpen] = useState(false);
    const [boxLeftDarkModalOpen, setBoxLeftDarkModalOpen] = useState(false);
    const [boxRightLightModalOpen, setBoxRightLightModalOpen] = useState(false);
    const [boxRightDarkModalOpen, setBoxRightDarkModalOpen] = useState(false);
    const [chatlistLightModalOpen, setChatlistLightModalOpen] = useState(false);
    const [chatlistDarkModalOpen, setChatlistDarkModalOpen] = useState(false);

    const logoLightInput = useRef(null);
    const logoDarkInput = useRef(null);
    const logoFaviconInput = useRef(null);
    const appNameInput = useRef(null);
    const [appName, setAppName] = useState(settingsLoaded.appName || "AutoAtende");  
    const [copyright, setCopyright] = useState(settingsLoaded.copyright || "");
    const [privacy, setPrivacy] = useState(settingsLoaded.privacy || "");
    const [terms, setTerms] = useState(settingsLoaded.terms || "");
    const {update} = useSettings();

    function updateSettingsLoaded(key, value) {
        const newSettings = {...settingsLoaded};
        newSettings[key] = value;
        setSettingsLoaded(newSettings);
        console.debug(key, value, newSettings, settingsLoaded);
    }

    useEffect(() => {
        getCurrentUserInfo().then(
            (u) => {
                setCurrentUser(u);
            }
        );

        console.debug("settings", settings);

        if (Array.isArray(settings) && settings.length) {
            const primaryColorLight = settings.find((s) => s.key === "primaryColorLight")?.value;
            const secondaryColorLight = settings.find((s) => s.key === "secondaryColorLight")?.value;
            const primaryColorDark = settings.find((s) => s.key === "primaryColorDark")?.value;
            const secondaryColorDark = settings.find((s) => s.key === "secondaryColorDark")?.value;
            const appLogoLight = settings.find((s) => s.key === "appLogoLight")?.value;
            const appLogoDark = settings.find((s) => s.key === "appLogoDark")?.value;
            const appLogoFavicon = settings.find((s) => s.key === "appLogoFavicon")?.value;
            const appName = settings.find((s) => s.key === "appName")?.value;

            const copyright = settings.find((s) => s.key === "copyright")?.value;
            const privacy = settings.find((s) => s.key === "privacy")?.value;
            const terms = settings.find((s) => s.key === "terms")?.value;


            const chatlistLight = settings.find((s) => s.key === "chatlistLight")?.value;
            const chatlistDark = settings.find((s) => s.key === "chatlistDark")?.value;
            const boxLeftLight = settings.find((s) => s.key === "boxLeftLight")?.value;
            const boxLeftDark = settings.find((s) => s.key === "boxLeftDark")?.value;
            const boxRightLight = settings.find((s) => s.key === "boxRightLight")?.value;
            const boxRightDark = settings.find((s) => s.key === "boxRightDark")?.value;

            setAppName(appName || "");
            setSettingsLoaded({
                ...settingsLoaded,
                primaryColorLight,
                secondaryColorLight,
                primaryColorDark,
                secondaryColorDark,
                appLogoLight,
                appLogoDark,
                appLogoFavicon,
                appName,
                copyright,
                privacy,
                terms,
                chatlistLight,
                chatlistDark,
                boxLeftLight,
                boxLeftDark,
                boxRightLight,
                boxRightDark,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings]);

    async function handleSaveSetting(key, value) {
        await update({
            key,
            value,
        });
        updateSettingsLoaded(key, value);
        toast.success("Operação atualizada com sucesso.");
    }

    const uploadLogo = async (e, mode) => {
        if (!e.target.files) {
            return;
        }

        const file = e.target.files[0];
        const formData = new FormData();

        formData.append("file", file);
        formData.append("mode", mode);

        api.post("/settings/logo", formData, {
            onUploadProgress: (event) => {
                let progress = Math.round(
                    (event.loaded * 100) / event.total
                );
                console.log(
                    `A imagem  está ${progress}% carregada... `
                );
            },
        }).then((response) => {
            updateSettingsLoaded(`appLogo${mode}`, response.data);
            colorMode[`setAppLogo${mode}`](process.env.REACT_APP_BACKEND_URL + "/public/" + response.data);
        }).catch((err) => {
            console.error(
                `Houve um problema ao realizar o upload da imagem.`
            );
            console.log(err);
        });
    };

    return (
        <>
            <Grid spacing={3} container>
                {/* <Grid xs={12} item>
                    <Title>Configurações Gerais</Title>
                </Grid> */}

                <Grid xs={12} sm={6} md={4} item>
                    <FormControl className={classes.selectContainer}>
                        <TextField
                            id="appname-field"
                            label="Nome do sistema"
                            variant="standard"
                            name="appName"
                            value={appName}
                            inputRef={appNameInput}
                            onChange={(e) => {
                                setAppName(e.target.value);
                            }}
                            onBlur={async (_) => {
                                await handleSaveSetting("appName", appName);
                                colorMode.setAppName(appName || "AutoAtende");
                            }}
                        />
                    </FormControl>
                </Grid>
            <OnlyForSuperUser
                user={currentUser}
                yes={() => (
                <>
                <Grid xs={12} sm={6} md={4} item>
                    <FormControl className={classes.selectContainer}>
                        <TextField
                            id="privacy-field"
                            label="Link da Política de Privacidade"
                            variant="standard"
                            value={settingsLoaded.privacy}
                            onChange={(e) => setPrivacy(e.target.value)}
                            onBlur={() => handleSaveSetting("privacy", privacy)}
                        />
                    </FormControl>
                </Grid>
                <Grid xs={12} sm={6} md={4} item>
                    <FormControl className={classes.selectContainer}>
                        <TextField
                            id="terms-field"
                            label="Link dos Termos de uso"
                            variant="standard"
                            value={settingsLoaded.terms}
                            onChange={(e) => setTerms(e.target.value)}
                            onBlur={() => handleSaveSetting("terms", terms)}
                        />
                    </FormControl>
                </Grid>
                </>
                )}
            />
                <Grid xs={12} sm={6} md={4} item>
                    <FormControl className={classes.selectContainer}>
                        <TextField
                            id="primary-color-light-field"
                            label="Cor Primária Modo Claro"
                            variant="standard"
                            value={settingsLoaded.primaryColorLight || ""}
                            type={'color'}
                            onChange={(e) => {
                                if (e.target.value.startsWith("#") && e.target.value.length === 7) {
                                    handleSaveSetting("primaryColorLight", e.target.value).then(r => colorMode.setPrimaryColorLight(e.target.value));
                                } else {
                                    toast.error("Cor inválida");
                                }
                            }}

                        />
                    </FormControl>
                </Grid>
                <Grid xs={12} sm={6} md={4} item>
                    <FormControl className={classes.selectContainer}>
                        <TextField
                            id="secondary-color-light-field"
                            label="Cor secundária Modo Claro"
                            variant="standard"
                            type={'color'}
                            value={settingsLoaded.secondaryColorLight || ""}
                            onChange={(e) => {
                                if (e.target.value.startsWith("#") && e.target.value.length === 7) {
                                    handleSaveSetting("secondaryColorLight", e.target.value).then(r => colorMode.setSecondaryColorLight(e.target.value));
                                } else {
                                    toast.error("Cor inválida");
                                }
                            }
                            }
                        />
                    </FormControl>

                </Grid>
                <Grid xs={12} sm={6} md={4} item>
                    <FormControl className={classes.selectContainer}>
                        <TextField
                            id="primary-color-dark-field"
                            label="Cor Primária Modo Escuro"
                            variant="standard"
                            value={settingsLoaded.primaryColorDark || ""}
                            type={'color'}
                            onChange={(e) => {
                                if (e.target.value.startsWith("#") && e.target.value.length === 7) {
                                    handleSaveSetting("primaryColorDark", e.target.value).then(r => colorMode.setPrimaryColorDark(e.target.value));
                                } else {
                                    toast.error("Cor inválida");
                                }
                            }}
                        />
                    </FormControl>

                </Grid>
                <Grid xs={12} sm={6} md={4} item>
                    <FormControl className={classes.selectContainer}>
                        <TextField
                            id="secondary-color-dark-field"
                            label="Cor Secundária Modo Escuro"
                            variant="standard"
                            value={settingsLoaded.secondaryColorDark || ""}
                            type={'color'}
                            onChange={(e) => {
                                if (e.target.value.startsWith("#") && e.target.value.length === 7) {
                                    handleSaveSetting("secondaryColorDark", e.target.value).then(r => colorMode.setSecondaryColorDark(e.target.value));
                                } else {
                                    toast.error("Cor inválida");
                                }
                            }}
                        />
                    </FormControl>

                </Grid>


                <Grid xs={12} sm={6} md={4} item>
                    <FormControl className={classes.selectContainer}>
                        <TextField
                            id="color-chatlist-field"
                            label="Fundo Chat Interno Modo Claro"
                            variant="standard"
                            value={settingsLoaded.chatlistLight || ""}
                            type={'color'}
                            onChange={(e) => {
                                if (e.target.value.startsWith("#") && e.target.value.length === 7) {
                                    handleSaveSetting("chatlistLight", e.target.value).then(r => colorMode.setChatlistLight(e.target.value));
                                } else {
                                    toast.error("Cor inválida");
                                }
                            }}
                        />
                    </FormControl>

                </Grid>
                <Grid xs={12} sm={6} md={4} item>
                    <FormControl className={classes.selectContainer}>
                        <TextField
                            id="color-chatlist-field"
                            label="Fundo Chat Interno Modo Escuro"
                            variant="standard"
                            value={settingsLoaded.chatlistDark || ""}
                            type={'color'}
                            onChange={(e) => {
                                if (e.target.value.startsWith("#") && e.target.value.length === 7) {
                                    handleSaveSetting("chatlistDark", e.target.value).then(r => colorMode.setChatlistDark(e.target.value));
                                } else {
                                    toast.error("Cor inválida");
                                }
                            }}
                        />
                    </FormControl>

                </Grid>

                <Grid xs={12} sm={6} md={4} item>
                    <FormControl className={classes.selectContainer}>
                        <TextField
                            id="color-boxRight-field"
                            label="Mensagens do usuário Modo Claro"
                            variant="standard"
                            value={settingsLoaded.boxRightLight || ""}
                            type={'color'}
                            onChange={(e) => {
                                if (e.target.value.startsWith("#") && e.target.value.length === 7) {
                                    handleSaveSetting("boxRightLight", e.target.value).then(r => colorMode.setBoxRightLight(e.target.value));
                                } else {
                                    toast.error("Cor inválida");
                                }
                            }}
                        />
                    </FormControl>

                </Grid>
                <Grid xs={12} sm={6} md={4} item>
                    <FormControl className={classes.selectContainer}>
                        <TextField
                            id="color-boxRight-field"
                            label="Mensagens do usuário Modo Escuro"
                            variant="standard"
                            value={settingsLoaded.boxRightDark || ""}

                            type={'color'}
                            onChange={(e) => {
                                if (e.target.value.startsWith("#") && e.target.value.length === 7) {
                                    handleSaveSetting("boxRightDark", e.target.value).then(r => colorMode.setBoxRightDark(e.target.value));
                                } else {
                                    toast.error("Cor inválida");
                                }
                            }}
                        />
                    </FormControl>

                </Grid>

                <Grid xs={12} sm={6} md={4} item>
                    <FormControl className={classes.selectContainer}>
                        <TextField
                            id="color-boxLeft-field"
                            label="Mensagens de outros Modo Claro"
                            variant="standard"
                            value={settingsLoaded.boxLeftLight || ""}
                            type={'color'}
                            onChange={(e) => {
                                if (e.target.value.startsWith("#") && e.target.value.length === 7) {
                                    handleSaveSetting("boxLeftLight", e.target.value).then(r => colorMode.setBoxLeftLight(e.target.value));
                                } else {
                                    toast.error("Cor inválida");
                                }
                            }}
                        />
                    </FormControl>


                </Grid>
                <Grid xs={12} sm={6} md={4} item>
                    <FormControl className={classes.selectContainer}>
                        <TextField
                            id="color-boxLeft-field"
                            label="Mensagens de outros Modo Escuro"
                            variant="standard"
                            value={settingsLoaded.boxLeftDark || ""}
                            type={'color'}
                            onChange={(e) => {
                                if (e.target.value.startsWith("#") && e.target.value.length === 7) {
                                    handleSaveSetting("boxLeftDark", e.target.value).then(r => colorMode.setBoxLeftDark(e.target.value));
                                } else {
                                    toast.error("Cor inválida");
                                }
                            }}
                        />
                    </FormControl>

                </Grid>

                <Grid xs={12} sm={6} md={4} item>
                </Grid>
                <Grid xs={12} sm={6} md={4} item>
                    <FormControl className={classes.selectContainer}>
                        <TextField
                            id="logo-light-upload-field"
                            label="Logotipo claro"
                            variant="standard"
                            value={settingsLoaded.appLogoLight || ""}
                            InputProps={{
                                endAdornment: (
                                    <>
                                        {settingsLoaded.appLogoLight &&
                                            <IconButton
                                                size="small"
                                                color="default"
                                                onClick={() => {
                                                    handleSaveSetting("appLogoLight", "");
                                                    colorMode.setAppLogoLight(defaultLogoLight);
                                                }
                                                }
                                            >
                                                <Delete/>
                                            </IconButton>
                                        }
                                        <input
                                            type="file"
                                            id="upload-logo-light-button"
                                            ref={logoLightInput}
                                            className={classes.uploadInput}
                                            onChange={(e) => uploadLogo(e, "Light")}
                                        />
                                        <label htmlFor="upload-logo-light-button">
                                            <IconButton
                                                size="small"
                                                color="default"
                                                onClick={
                                                    () => {
                                                        logoLightInput.current.click();
                                                    }
                                                }
                                            >
                                                <AttachFile/>
                                            </IconButton>
                                        </label>
                                    </>
                                ),
                            }}
                        />
                    </FormControl>
                </Grid>
                <Grid xs={12} sm={6} md={4} item>
                    <FormControl className={classes.selectContainer}>
                        <TextField
                            id="logo-dark-upload-field"
                            label="Logotipo escuro"
                            variant="standard"
                            value={settingsLoaded.appLogoDark || ""}
                            InputProps={{
                                endAdornment: (
                                    <>
                                        {settingsLoaded.appLogoDark &&
                                            <IconButton
                                                size="small"
                                                color="default"
                                                onClick={() => {
                                                    handleSaveSetting("appLogoDark", "");
                                                    colorMode.setAppLogoDark(defaultLogoDark);
                                                }
                                                }
                                            >
                                                <Delete/>
                                            </IconButton>
                                        }
                                        <input
                                            type="file"
                                            id="upload-logo-dark-button"
                                            ref={logoDarkInput}
                                            className={classes.uploadInput}
                                            onChange={(e) => uploadLogo(e, "Dark")}
                                        />
                                        <label htmlFor="upload-logo-dark-button">
                                            <IconButton
                                                size="small"
                                                color="default"
                                                onClick={
                                                    () => {
                                                        logoDarkInput.current.click();
                                                    }
                                                }
                                            >
                                                <AttachFile/>
                                            </IconButton>
                                        </label>
                                    </>
                                ),
                            }}
                        />
                    </FormControl>
                </Grid>
                <Grid xs={12} sm={6} md={4} item>
                    <FormControl className={classes.selectContainer}>
                        <TextField
                            id="logo-favicon-upload-field"
                            label="Favicon"
                            variant="standard"
                            value={settingsLoaded.appLogoFavicon || ""}
                            InputProps={{
                                endAdornment: (
                                    <>
                                        {settingsLoaded.appLogoFavicon &&
                                            <IconButton
                                                size="small"
                                                color="default"
                                                onClick={() => {
                                                    handleSaveSetting("appLogoFavicon", "");
                                                    colorMode.setAppLogoFavicon(defaultLogoFavicon);
                                                }
                                                }
                                            >
                                                <Delete/>
                                            </IconButton>
                                        }
                                        <input
                                            type="file"
                                            id="upload-logo-favicon-button"
                                            ref={logoFaviconInput}
                                            className={classes.uploadInput}
                                            onChange={(e) => uploadLogo(e, "Favicon")}
                                        />
                                        <label htmlFor="upload-logo-favicon-button">
                                            <IconButton
                                                size="small"
                                                color="default"
                                                onClick={
                                                    () => {
                                                        logoFaviconInput.current.click();
                                                    }
                                                }
                                            >
                                                <AttachFile/>
                                            </IconButton>
                                        </label>
                                    </>
                                ),
                            }}
                        />
                    </FormControl>
                </Grid>
                <Grid xs={12} sm={6} md={4} item>
                    <div className={classes.appLogoLightPreviewDiv}>
                        <img className={classes.appLogoLightPreviewImg} alt="light-logo-preview"/>
                    </div>
                </Grid>
                <Grid xs={12} sm={6} md={4} item>
                    <div className={classes.appLogoDarkPreviewDiv}>
                        <img className={classes.appLogoDarkPreviewImg} alt="dark-logo-preview"/>
                    </div>
                </Grid>
                <Grid xs={12} sm={6} md={4} item>
                    <div className={classes.appLogoFaviconPreviewDiv}>
                        <img className={classes.appLogoFaviconPreviewImg} alt="favicon-logo-preview"/>
                    </div>
                </Grid>

            </Grid>
        </>
    );
}