import React, {useState, useEffect} from "react";
import qs from "query-string";

import * as Yup from "yup";
import {useHistory} from "react-router-dom";
import {Link as RouterLink} from "react-router-dom";
import {toast} from "react-toastify";
import {Formik, Form, Field} from "formik";
import usePlans from "../../hooks/usePlans";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Link from "@material-ui/core/Link";
import Grid from "@material-ui/core/Grid";
import Box from "@material-ui/core/Box";
import {FormControl, InputLabel, MenuItem, Select, useTheme} from "@material-ui/core";
import Typography from "@material-ui/core/Typography";
import {makeStyles} from "@material-ui/core/styles";
import {i18n} from "../../translate/i18n";
import "./style.css";
import {openApi} from "../../services/api";
import toastError from "../../errors/toastError";
import moment from "moment";
import useSettings from "../../hooks/useSettings";

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
    avatar: {
        margin: theme.spacing(1),
        backgroundColor: theme.palette.secondary.main,
    },
    form: {
        width: "100%",
        marginTop: theme.spacing(3),
    },
    submit: {
        "&.MuiButton-root": {
            margin: "20px 0px 16px",
        },


        logoImg: {
            width: "100%",
            margin: "0 auto",
            content: "url(" + (theme.mode === "light" ? theme.calculatedLogoLight() : theme.calculatedLogoDark()) + ")"
        },

        margin: theme.spacing(3, 0, 2),
    },
}));

const UserSchema = Yup.object().shape({
    name: Yup.string()
        .min(2, "Too Short!")
        .max(50, "Too Long!")
        .required("Required"),
    password: Yup.string().min(5, "Too Short!").max(50, "Too Long!"),
    email: Yup.string().email("Invalid email").required("Required"),
    phone: Yup.string().matches(/^[0-9]+$/, "Phone number must be numeric").required("Required").min(9, "Too short!").max(16, "To long!")
});

const SignUp = () => {
    const theme = useTheme();
    const classes = useStyles();
    const history = useHistory();
    let companyId = null;

    const {getPublicSetting} = useSettings();
    const [allowSignup, setAllowSignup] = useState(false);
    const [privacyUrl, setPrivacyUrl] = useState("");
    const [termsUrl, setTermsUrl] = useState("");
    const [trialExpiration, setTrialExpiration] = useState ("")

    const params = qs.parse(window.location.search);
    if (params.companyId !== undefined) {
        companyId = params.companyId;
    }

    const initialState = {
        name: "",
        email: "",
        phone: "",
        password: "",
        planId: "",
    };

    const [user] = useState(initialState);
    const dueDate = moment().add(trialExpiration || 7, "day").format();
    const handleSignUp = async (values) => {
        Object.assign(values, {recurrence: "MENSAL"});
        Object.assign(values, {status: "t"});
        Object.assign(values, {campaignsEnabled: false});
        try {
            await openApi.post("/companies/cadastro", values);
            localStorage.setItem('email', values.email); //SALVA O E-MAIL CADASTRADO NO CACHE
            toast.success(i18n.t("signup.toasts.success"));
            history.push("/login");
        } catch (err) {
            console.log(err);
            toastError(err);
        }
    };

    const [plans, setPlans] = useState([]);
    const {list: listPlans} = usePlans();

    useEffect(() => {
        async function fetchData() {
            const allPlans = await listPlans();
            const visiblePlans = allPlans.filter(plan => plan.isVisible);
            setPlans(visiblePlans);
        }

        fetchData();
    }, [listPlans]);

    useEffect(() => {
        getPublicSetting("allowSignup").then(
            (data) => {
                setAllowSignup(data === "enabled");
            }
        );        
        getPublicSetting("privacy").then(
            (data) => {
                if (data) setPrivacyUrl(data);
            }
        );
        getPublicSetting("terms").then(
            (data) => {
                if (data) setTermsUrl(data);
            }
        );
        getPublicSetting("trialExpiration").then(
            (data) => {
                if (data) setTrialExpiration(data);
            }
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="geral-signup">
            <div className={"container-signup"}>
                <div className={"paper"}>
                    <div className={"container-img"}>
                        <img className={classes.logoImg}/>
                    </div>

                    <h4 className="h4" style={{color: theme.palette.primary.main, fontWeight: 500}}>⚡ {i18n.t("signup.title")}</h4>

                    <div>
            <span className="span">
              👋🏻 Comece seu <b>teste GRATUITO</b> de {trialExpiration || 7} dias do AutoAtende em
              apenas 3 etapas!{" "}
                <b>Não se preocupe, nós não pedimos dados do seu cartão.</b> 💳
            </span>
                    </div>
                    {/*<Typography component="h1" variant="h5">
    			{i18n.t("signup.title")}
    		</Typography>*/}
                    {/* <form className={classes.form} noValidate onSubmit={handleSignUp}> */}

                    <Formik
                        initialValues={user}
                        enableReinitialize={true}
                        validationSchema={UserSchema}
                        onSubmit={(values, actions) => {
                            setTimeout(() => {
                                handleSignUp(values);
                                actions.setSubmitting(false);
                            }, 400);
                        }}
                    >
                        {({touched, errors, isSubmitting}) => (
                            <Form className={classes.form}>
                                {allowSignup === true &&
                                    <>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12}>
                                                <p>Qual o seu nome?</p>
                                                <Field
                                                    as={TextField}
                                                    margin="dense"
                                                    autoComplete="name"
                                                    name="name"
                                                    error={touched.name && Boolean(errors.name)}
                                                    helperText={touched.name && errors.name}
                                                    variant="outlined"
                                                    fullWidth
                                                    id="name"
                                                    label="Seu Nome"
                                                />
                                            </Grid>
                                            <Grid item xs={12}>
                                                <p>Seu número de Whatsapp</p>
                                                <Field
                                                    as={TextField}
                                                    margin="dense"
                                                    variant="outlined"
                                                    fullWidth
                                                    id="phone"
                                                    label="Telefone com (DDD)"
                                                    name="phone"
                                                    error={touched.email && Boolean(errors.email)}
                                                    helperText={touched.email && errors.email}
                                                    autoComplete="phone"
                                                    required
                                                />
                                            </Grid>

                                            <Grid item xs={12}>
                                                <p>Seus email de acesso</p>
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

                                            <Grid item xs={12}>
                                                <p>Sua senha</p>

                                                <Field
                                                    as={TextField}
                                                    margin="dense"
                                                    variant="outlined"
                                                    fullWidth
                                                    name="password"
                                                    error={touched.password && Boolean(errors.password)}
                                                    helperText={touched.password && errors.password}
                                                    label={i18n.t("signup.form.password")}
                                                    type="password"
                                                    id="password"
                                                    autoComplete="current-password"
                                                    required
                                                />
                                            </Grid>
                                            <Grid item xs={12}>
                                                <InputLabel htmlFor="plan-selection">Escolha um Plano</InputLabel>
                                                <Field
                                                    as={Select}
                                                    margin="dense"
                                                    variant="outlined"
                                                    fullWidth
                                                    id="plan-selection"
                                                    label="Plano"
                                                    name="planId"
                                                    required
                                                >
                                                    {plans.map((plan, key) => (
                                                        <MenuItem key={key} value={plan.id}>
                                                            {plan.name} - Atendentes: {plan.users} - WhatsApp:{" "}
                                                            {plan.connections} - Filas: {plan.queues} - R${" "}
                                                            {plan.value}
                                                        </MenuItem>
                                                    ))}
                                                </Field>
                                            </Grid>
                                        </Grid>
                                        <Button
                                            type="submit"
                                            margin="dense"
                                            fullWidth
                                            variant="contained"
                                            color="primary"
                                            className={classes.submit}
                                        >
                                            {i18n.t("signup.buttons.submit")}
                                        </Button>
                                    </>
                                }
                                {allowSignup || <h2>Cadastro desabilitado!</h2>}
                                <Grid>
                                    <Grid item>
                                        <Link
                                            href="#"
                                            variant="primary"
                                            component={RouterLink}
                                            to="/login"
                                            style={{color: theme.palette.secondary.main, fontWeight: 500}}
                                        >
                                            {i18n.t("signup.buttons.login")}
                                        </Link>
                                    </Grid>
                                </Grid>
                            </Form>
                        )}
                    </Formik>
                </div>
                <div className="footer">
                    <p className="p">
                        Copyright ©{" "}
                        <a href={"#"} target={"_blank"}>
                            {theme.appName}
                        </a>{" "}
                        2024{" "}
                    </p>

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
                        
                    <p className="p">
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
                <Box mt={5}>{/* <Copyright /> */}</Box>
            </div>
            <div className={"container-img-signup"}>
                <div className="img-signup"></div>
            </div>
        </div>
    );
};

export default SignUp;