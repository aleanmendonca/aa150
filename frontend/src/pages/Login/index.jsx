import React, {useState, useContext, useEffect} from "react";
import {Link as RouterLink} from "react-router-dom";
import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";
import CssBaseline from "@material-ui/core/CssBaseline";
import TextField from "@material-ui/core/TextField";
import Link from "@material-ui/core/Link";
import Typography from "@material-ui/core/Typography";
import {makeStyles, useTheme} from "@material-ui/core/styles";
import {i18n} from "../../translate/i18n";
import "./style.css";
import {AuthContext} from "../../context/Auth/AuthContext";
import useSettings from "../../hooks/useSettings";
import {Visibility, VisibilityOff} from "@material-ui/icons";
import IconButton from "@material-ui/core/IconButton";
import {InputAdornment} from "@material-ui/core";

const Copyright = (companyName) => {
    return (
        <Typography variant="body2" color="primary" align="center">
            {"Copyright "}
            <Link color="primary" href="#">
                {companyName}
            </Link>{" "}
            {new Date().getFullYear()}
            {"."}
        </Typography>
    );
};

const useStyles = makeStyles((theme) => ({

    link: {
        textDecoration: "none",
        textDecorationColor: theme.palette.secondary.main,
        textEmphasisColor: theme.palette.secondary.main,
        WebkitTextFillColor: theme.palette.secondary.main,
        WebkitTextStrokeColor: theme.palette.secondary.main,
        "&:hover": {
            textDecoration: "underline",
        },
    },

    root: {
        width: "100vw",
        height: "100vh",
        background: "#F1F5F5",
        backgroundRepeat: "no-repeat",
        backgroundSize: "100% 100%",
        backgroundPosition: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
    },

    paper: {
        backgroundColor: theme.palette.login, //DARK MODE PLW DESIGN//
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "55px 30px",
        borderRadius: "12.5px",
    },
    avatar: {
        margin: theme.spacing(1),
        backgroundColor: theme.palette.secondary.main,
    },
    form: {
        width: "100%", // Fix IE 11 issue.
        marginTop: theme.spacing(1),
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
    },
    submit: {
        "&.MuiButton-root": {
            margin: "20px 0px 16px",
        },

        margin: theme.spacing(3, 0, 2),
        width: "100%",
    },
    powered: {
        color: "white",
    },
    logoImg: {
        width: "75%",
        margin: "0 auto",
        content: "url(" + (theme.mode === "light" ? theme.calculatedLogoLight() : theme.calculatedLogoDark()) + ")"
    },
    loginBox: {
        paddingRight: '0.75rem',
        paddingLeft: '0.75rem',
    },
    gap: {
        gap: '2rem'
    },

}));

const Login = () => {
    const theme = useTheme();

    const classes = useStyles();

    const {getPublicSetting} = useSettings();

    //RECUPERA O E-MAIL SALVO NO MOMENTO DO CADASTRO
    const [user, setUser] = useState({
        email: localStorage.getItem("email") || "",
        password: "",
    });

    const [allowSignup, setAllowSignup] = useState(false);
    const [privacyUrl, setPrivacyUrl] = useState("");
    const [termsUrl, setTermsUrl] = useState("");

    const {handleLogin} = useContext(AuthContext);

    const handleChangeInput = (e) => {
        setUser({...user, [e.target.name]: e.target.value});
    };

    const handlSubmit = (e) => {
        e.preventDefault();
        handleLogin(user).then(() => {
            localStorage.removeItem("email"); // Limpar o e-mail do localStorage após o login bem-sucedido
        });
    };
    const [showPassword, setShowPassword] = useState(false);
    const handleClickShowPassword = () => setShowPassword(!showPassword);

    useEffect(() => {
        getPublicSetting("allowSignup").then(
            (data) => {
                console.log("Allow Signup Data:", data); // Adicione esta linha
                setAllowSignup(data === "enabled");
            }
        );
        getPublicSetting("privacy").then(
            (data) => {
                console.log("Privacy Data:", data); // Adicione esta linha
                if (data) setPrivacyUrl(data);
            }
        );
        getPublicSetting("terms").then(
            (data) => {
                console.log("Terms Data:", data); // Adicione esta linha
                if (data) setTermsUrl(data);
            }
        );
    }, [getPublicSetting]);
    

    return (
        <div className={'container-right'}>
            <CssBaseline/>

            <Grid className={classes.gap} container alignItems={'center'} direction={'column'}>

                <Grid item xs={12}>
                    <div className={"container-img"}>
                        <img className={classes.logoImg}/>
                    </div>
                </Grid>
                <Grid item xs={12} className={classes.loginBox}>

                    <div className={"box"}>
                        <div className={"container-header-box"}>
        <span className={"label-text"}
              style={{
                  textDecoration: "none",
                  backgroundColor: theme.palette.primary.main,
                  fontSize: "15px",
                  borderRadius: "30px",
                  padding: "8px",
                  WebkitTextFillColor: theme.palette.primary.contrastText,
              }}
        >
        {i18n.t("login.title2")}</span>
                        </div>

                        <form className={classes.form} noValidate onSubmit={handlSubmit}>
                            <TextField

                                variant="outlined"
                                margin="dense"
                                required
                                fullWidth
                                id="email"
                                label={i18n.t("login.form.email")}
                                name="email"
                                value={user.email}
                                onChange={handleChangeInput}
                                autoComplete="email"
                                autoFocus

                            />
                            <TextField
                                variant="outlined"
                                margin="dense"
                                required
                                fullWidth
                                type={showPassword ? "text" : "password"}
                                InputProps={{ // <-- This is where the toggle button is added.
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label="toggle password visibility"
                                                onClick={handleClickShowPassword}
                                            >
                                                {showPassword ? <Visibility/> : <VisibilityOff/>}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                                name="password"
                                label={i18n.t("login.form.password")}
                                id="password"
                                value={user.password}
                                onChange={handleChangeInput}
                                autoComplete="current-password"

                            />
                            {<Grid container>
                                <Grid item>
                                    <Link
                                        href="#"
                                        variant="body2"
                                        component={RouterLink}
                                        to="/forgetpsw"
                                    >
                                        {i18n.t("Esqueci minha senha")}
                                    </Link>
                                </Grid>
                            </Grid>}
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                color="primary"
                                className={classes.submit}
                            >
                                {i18n.t("login.buttons.submit")}
                            </Button>

                            <Link
                                component={RouterLink}
                                tabIndex={0}
                                fullWidth
                                role={"button"}
                                aria-disabled={allowSignup === false}
                                to="/signup"
                                style={{textDecoration: "none"}}
                            >
                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    disabled={allowSignup === false}
                                    color="secondary"

                                >
                                    {i18n.t("login.buttons.register")}
                                </Button>

                            </Link>

                        </form>
                        <div className={"container-footer-form"}>
                        <p>
                                Ao prosseguir, você concorda com nossos{" "}
                                <a className={classes.link} href={termsUrl || "/term"} target={"_blank"}>
                                    Termos de Serviço
                                </a>{" "}
                                e{" "}
                                <a className={classes.link} href={privacyUrl || "/privacy"} target={"_blank"}>
                                    Política de Privacidade
                                </a>
                            </p>
                        </div>
                    </div>
                </Grid>
                <Grid item xs={12}>

                    <div className="container-footer">
                        <p>
                            Copyright ©{" "}
                            <a href={"#"} target={"_blank"}>
                                {theme.appName || "AutoAtende"}
                            </a>{" "}
                            2024{" "}
                        </p>
                        <p>
                            This site is protected by reCAPTCHA Enterprise and the Google{" "}
                            <a href={"https://policies.google.com/privacy"} target={"_blank"}>
                                Privacy Policy
                            </a>{" "}
                            and{" "}
                            <a href={"https://policies.google.com/terms"} target={"_blank"}>
                                Terms of Service
                            </a>
                        </p>
                    </div>
                </Grid>
            </Grid>

        </div>
    );
};

export default Login;