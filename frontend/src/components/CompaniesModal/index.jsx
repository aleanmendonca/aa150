import React, { useState, useEffect } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	CircularProgress,
	TextField,
	InputAdornment,
	IconButton,
	FormControlLabel,
	Switch,
	InputLabel,
	MenuItem,
	Select,
	Grid
} from '@material-ui/core';

import { Visibility, VisibilityOff } from '@material-ui/icons';

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import usePlans from "../../hooks/usePlans";

const useStyles = makeStyles(theme => ({
	root: {
		display: "flex",
		flexWrap: "wrap",
	},
	multFieldLine: {
		display: "flex",
		"& > *:not(:last-child)": {
			marginRight: theme.spacing(1),
		},
	},

	btnWrapper: {
		position: "relative",
	},

	buttonProgress: {
		color: green[500],
		position: "absolute",
		top: "50%",
		left: "50%",
		marginTop: -12,
		marginLeft: -12,
	},
	formControl: {
		margin: theme.spacing(1),
		minWidth: 120,
	},
}));

const CompanySchema = Yup.object().shape({
	name: Yup.string()
		.min(2, "Too Short!")
		.max(50, "Too Long!")
		.required("Nome é obrigatório"),
	email: Yup.string().email("Email é inválido").required("E-mail é obrigatório"),
	passwordDefault: Yup.string().required("Senha é obrigatório")
});

const CompanyModal = ({ open, onClose, companyId }) => {
	const classes = useStyles();

	const initialState = {
		name: "",
		email: "",
		passwordDefault: "",
		status: false,
		planId: null
	};

	const [company, setCompany] = useState(initialState);
	const [showPassword, setShowPassword] = useState(false);
	const [plans, setPlans] = useState([]);

	const { list: listPlans } = usePlans();

	useEffect(() => {
		async function fetchData() {
			const list = await listPlans();
			setPlans(list);
		}
		fetchData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		const fetchCompany = async () => {
			if (!companyId) return;
			try {
				const { data } = await api.get(`/companies/listPlan/${companyId}`);
				console.log(data);
				setCompany(prevState => {
					return { ...prevState, ...data };
				});
			} catch (err) {
				toastError(err);
			}
		};

		fetchCompany();
	}, [companyId, open]);

	const handleClose = () => {
		onClose();
		setCompany(initialState);
	};

	const handleSaveCompany = async values => {
		const companyData = { ...values };
		try {
			if (companyId) {
				await api.put(`/companies/${companyId}`, companyData);
				toast.success(i18n.t("companyModal.success"));
			} else {
				await api.post("/companies", companyData);
				toast.success(i18n.t("companyModal.add"));
			}

		} catch (err) {
			toastError(err);
		}
		handleClose();
	};

	return (
		<div className={classes.root}>
			<Dialog
				open={open}
				onClose={handleClose}
				maxWidth="xs"
				fullWidth
				scroll="paper"
			>
				<DialogTitle id="form-dialog-title">
					{companyId
						? `${i18n.t("compaies.title.edit")}`
						: `${i18n.t("compaies.title.add")}`}
				</DialogTitle>
				<Formik
					initialValues={company}
					enableReinitialize={true}
					validationSchema={CompanySchema}
					onSubmit={(values, actions) => {
						setTimeout(() => {
							handleSaveCompany(values);
							actions.setSubmitting(false);
						}, 400);
					}}
				>
					{({ values, touched, errors, isSubmitting }) => (
						<Form>
							<DialogContent dividers>
								<div className={classes.multFieldLine}>
									<Field
										as={TextField}
										label={i18n.t("compaies.table.name")}
										autoFocus
										name="name"
										error={touched.name && Boolean(errors.name)}
										helperText={touched.name && errors.name}
										variant="outlined"
										margin="dense"
										fullWidth
									/>
								</div>
								<div className={classes.multFieldLine}>
									<FormControlLabel
										control={
											<Field
												as={Switch}
												color="primary"
												name="status"
												checked={values.status}
											/>
										}
										label={"Ativo"}
									/>
								</div>
								<div className={classes.multFieldLine}>
									<Field
										as={TextField}
										label={i18n.t("compaies.table.email")}
										name="email"
										error={touched.email && Boolean(errors.email)}
										helperText={touched.email && errors.email}
										variant="outlined"
										margin="dense"
										fullWidth
									/>
								</div>
								<div className={classes.multFieldLine}>
									<Field
										as={TextField}
										name="passwordDefault"
										variant="outlined"
										margin="dense"
										label={i18n.t("compaies.table.passwordDefault")}
										error={touched.passwordDefault && Boolean(errors.passwordDefault)}
										helperText={touched.passwordDefault && errors.passwordDefault}
										type={showPassword ? 'text' : 'password'}
										InputProps={{
											endAdornment: (
												<InputAdornment position="end">
													<IconButton
														aria-label="toggle password visibility"
														onClick={() => setShowPassword((e) => !e)}
													>
														{showPassword ? <VisibilityOff /> : <Visibility />}
													</IconButton>
												</InputAdornment>
											)
										}}
										fullWidth
									/>
								</div>


								<Grid>
									<Grid item xs={12}>
										<InputLabel htmlFor="plan-selection">Plano</InputLabel>
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
							</DialogContent>
							<DialogActions>
								<Button
									onClick={handleClose}
									color="secondary"
									disabled={isSubmitting}
									variant="outlined"
								>
									{i18n.t("compaies.buttons.cancel")}
								</Button>
								<Button
									type="submit"
									color="primary"
									disabled={isSubmitting}
									variant="contained"
									className={classes.btnWrapper}
								>
									{companyId
										? `${i18n.t("compaies.buttons.okEdit")}`
										: `${i18n.t("compaies.buttons.okAdd")}`}
									{isSubmitting && (
										<CircularProgress
											size={24}
											className={classes.buttonProgress}
										/>
									)}
								</Button>
							</DialogActions>
						</Form>
					)}
				</Formik>
			</Dialog>
		</div>
	);
};

export default CompanyModal;
