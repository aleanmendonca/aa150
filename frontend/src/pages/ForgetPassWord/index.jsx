import React, {useState} from "react";
import qs from "query-string";
import IconButton from "@material-ui/core/IconButton";
import VisibilityIcon from "@material-ui/icons/Visibility";
import VisibilityOffIcon from "@material-ui/icons/VisibilityOff";
import InputAdornment from "@material-ui/core/InputAdornment";
import * as Yup from "yup";
import {useHistory} from "react-router-dom";
import {Link as RouterLink} from "react-router-dom";
import {Formik, Form, Field} from "formik";
import Button from "@material-ui/core/Button";
import CssBaseline from "@material-ui/core/CssBaseline";
import TextField from "@material-ui/core/TextField";
import Link from "@material-ui/core/Link";
import Grid from "@material-ui/core/Grid";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import {makeStyles, useTheme} from "@material-ui/core/styles";
import Container from "@material-ui/core/Container";
import api from "../../services/api";
import {i18n} from "../../translate/i18n";
import moment from "moment";
import {toast} from 'react-toastify';
import toastError from '../../errors/toastError';
import 'react-toastify/dist/ReactToastify.css';
import {BrowserRouter as Router, Route, Switch} from "react-router-dom";
import "./style.css";

const useStyles = makeStyles((theme) => ({
    root: {
        width: "100vw",
        height: "100vh",
        background: "linear-gradient(to right, #6b1881 , #5e0874, #5e0874, #5e0874 , #6b1881)",
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
        backgroundColor: "white",
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
        width: "80%", // Fix IE 11 issue.
        marginTop: theme.spacing(1),
        paddingTop: "20px",
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
    loginBox: {
        paddingRight: '0.75rem',
        paddingLeft: '0.75rem',
    },
    logoImg: {
        width: "75%",
        margin: "0 auto",
        content: "url(" + (theme.mode === "light" ? theme.calculatedLogoLight() : theme.calculatedLogoDark()) + ")"
    },
    gap: {
        gap: '2rem'
    },
    powered: {
        color: "white",
    },
}));

const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;

const ForgetPassword = () => {
    const theme = useTheme();

    const classes = useStyles();
    const history = useHistory();
    let companyId = null;
    const [showAdditionalFields, setShowAdditionalFields] = useState(false);
    const [showResetPasswordButton, setShowResetPasswordButton] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState(""); // Estado para mensagens de erro

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const toggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword(!showConfirmPassword);
    };

    const toggleAdditionalFields = () => {
        setShowAdditionalFields(!showAdditionalFields);
        if (showAdditionalFields) {
            setShowResetPasswordButton(false);
        } else {
            setShowResetPasswordButton(true);
        }
    };

    const params = qs.parse(window.location.search);
    if (params.companyId !== undefined) {
        companyId = params.companyId;
    }

    const initialState = {email: ""};

    const [user] = useState(initialState);
    const dueDate = moment().add(3, "day").format();

    const handleSendEmail = async (values) => {
        const email = values.email;
        try {
            const response = await api.post(
                `${process.env.REACT_APP_BACKEND_URL}/forgetpassword/${email}`
            );
            console.log("API Response:", response.data);

            if (response.data.status === 404) {
            } else {
                toastError(i18n.t("resetpswd.error"));
            }
            history.push("/");
        } catch (err) {
            console.log("API Error:", err);
            toastError(err);
        }
    };

    const handleResetPassword = async (values) => {
        const email = values.email;
        const token = values.token;
        const newPassword = values.newPassword;
        const confirmPassword = values.confirmPassword;

        if (newPassword === confirmPassword) {
            try {
                await api.post(
                    `${process.env.REACT_APP_BACKEND_URL}/resetpasswords/${email}/${token}/${newPassword}`
                );
                setError(""); // Limpe o erro se não houver erro
                toastError(i18n.t("resetpswd.passwerror"));
                history.push("/");
            } catch (err) {
                console.log(err);
            }
        }
    };

    const isResetPasswordButtonClicked = showResetPasswordButton;
    const UserSchema = Yup.object().shape({
        email: Yup.string().email("Invalid email").required("Required"),
        newPassword: isResetPasswordButtonClicked
            ? Yup.string()
                .required("Campo obrigatório")
                .matches(
                    passwordRegex,
                    "Sua senha precisa ter no mínimo 8 caracteres, sendo uma letra maiúscula, uma minúscula e um número."
                )
            : Yup.string(), // Sem validação se não for redefinição de senha
        confirmPassword: Yup.string().when("newPassword", {
            is: (newPassword) => isResetPasswordButtonClicked && newPassword,
            then: Yup.string()
                .oneOf([Yup.ref("newPassword"), null], "As senhas não correspondem")
                .required("Campo obrigatório"),
            otherwise: Yup.string(), // Sem validação se não for redefinição de senha
        }),
    });

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
        {i18n.t("resetpswd.title2")}</span>
                        </div>
                        <Formik
                            initialValues={{
                                email: "",
                                token: "",
                                newPassword: "",
                                confirmPassword: "",
                            }}
                            enableReinitialize={true}
                            validationSchema={UserSchema}
                            onSubmit={(values, actions) => {
                                setTimeout(() => {
                                    if (showResetPasswordButton) {
                                        handleResetPassword(values);
                                    } else {
                                        handleSendEmail(values);
                                    }
                                    actions.setSubmitting(false);
                                    toggleAdditionalFields();
                                }, 400);
                            }}
                        >
                            {({touched, errors, isSubmitting}) => (
                                <Form className={classes.form}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12}>
                                            <Field
                                                as={TextField}

                                                variant="outlined"
                                                margin="dense"
                                                fullWidth
                                                id="email"
                                                label={i18n.t("signup.form.email")}
                                                name="email"
                                                error={touched.email && Boolean(errors.email)}
                                                helperText={touched.email && errors.email}
                                                autoComplete="email"
                                                required
                                            />
                                        </Grid>
                                        {showAdditionalFields && (
                                            <>
                                                <Grid item xs={12}>
                                                    <Field
                                                        as={TextField}
                                                        className={classes.input}
                                                        variant="outlined"
                                                        fullWidth
                                                        id="token"
                                                        label="Código de Verificação"
                                                        name="token"
                                                        error={touched.token && Boolean(errors.token)}
                                                        helperText={touched.token && errors.token}
                                                        autoComplete="off"
                                                        required
                                                    />
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <Field
                                                        as={TextField}
                                                        className={classes.input}
                                                        variant="outlined"
                                                        fullWidth
                                                        type={showPassword ? "text" : "password"}
                                                        id="newPassword"
                                                        label="Nova senha"
                                                        name="newPassword"
                                                        error={
                                                            touched.newPassword &&
                                                            Boolean(errors.newPassword)
                                                        }
                                                        helperText={
                                                            touched.newPassword && errors.newPassword
                                                        }
                                                        autoComplete="off"
                                                        required
                                                        InputProps={{
                                                            endAdornment: (
                                                                <InputAdornment position="end">
                                                                    <IconButton
                                                                        onClick={togglePasswordVisibility}
                                                                    >
                                                                        {showPassword ? (
                                                                            <VisibilityIcon/>
                                                                        ) : (
                                                                            <VisibilityOffIcon/>
                                                                        )}
                                                                    </IconButton>
                                                                </InputAdornment>
                                                            ),
                                                        }}
                                                    />
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <Field
                                                        as={TextField}
                                                        className={classes.input}
                                                        variant="outlined"
                                                        fullWidth
                                                        type={showConfirmPassword ? "text" : "password"}
                                                        id="confirmPassword"
                                                        label="Confirme a senha"
                                                        name="confirmPassword"
                                                        error={
                                                            touched.confirmPassword &&
                                                            Boolean(errors.confirmPassword)
                                                        }
                                                        helperText={
                                                            touched.confirmPassword &&
                                                            errors.confirmPassword
                                                        }
                                                        autoComplete="off"
                                                        required
                                                        InputProps={{
                                                            endAdornment: (
                                                                <InputAdornment position="end">
                                                                    <IconButton
                                                                        onClick={toggleConfirmPasswordVisibility}
                                                                    >
                                                                        {showConfirmPassword ? (
                                                                            <VisibilityIcon/>
                                                                        ) : (
                                                                            <VisibilityOffIcon/>
                                                                        )}
                                                                    </IconButton>
                                                                </InputAdornment>
                                                            ),
                                                        }}
                                                    />
                                                </Grid>
                                            </>
                                        )}
                                    </Grid>
                                    {showResetPasswordButton ? (
                                        <Button
                                            type="submit"
                                            fullWidth
                                            variant="contained"
                                            color="primary"
                                            className={classes.submit}
                                        >
                                            Redefinir Senha
                                        </Button>
                                    ) : (
                                        <Button
                                            type="submit"
                                            fullWidth
                                            variant="contained"
                                            color="primary"
                                            className={classes.submit}
                                        >
                                            Enviar Email
                                        </Button>
                                    )}
                                    <Grid container justifyContent="center">
                                        <Grid item>
                                            <Link
                                                href="#"
                                                variant="body2"
                                                component={RouterLink}
                                                to="/login"
                                                style={{color: theme.palette.secondary.main, fontWeight: 500}}
                                            >
                                                {i18n.t("signup.buttons.returlogin")}
                                            </Link>
                                        </Grid>
                                    </Grid>
                                    {error && (
                                        <Typography variant="body2" color="error">
                                            {error}
                                        </Typography>
                                    )}
                                </Form>
                            )}
                        </Formik>
                    </div>
                </Grid>
            </Grid>

        </div>
    );
};

export default ForgetPassword;