import React, { useState, useEffect, useContext, useRef } from "react";
import { useHistory } from "react-router-dom";

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
    Select,
    InputLabel,
    MenuItem,
    FormControl,
    TextField,
    InputAdornment,
    IconButton,
    Switch,
    FormControlLabel,
	Tabs,
	Tab
} from '@material-ui/core';

import { Visibility, VisibilityOff } from '@material-ui/icons';

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import QueueSelect from "../QueueSelect";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../Can";
import useWhatsApps from "../../hooks/useWhatsApps";

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
    textField: {
        marginRight: theme.spacing(1),
        flex: 1,
    },
    container: {
        display: 'flex',
        flexWrap: 'wrap',
    },
	tabsContainer: {
        display: "flex",
        justifyContent: "center",
    },
}));

const UserSchema = Yup.object().shape({
    name: Yup.string()
        .min(2, i18n.t("inputErrors.tooShort"))
        .max(50, i18n.t("inputErrors.tooLong"))
        .required(i18n.t("inputErrors.required")),
    password: Yup.string()
        .min(5, i18n.t("inputErrors.tooShort"))
        .max(50, i18n.t("inputErrors.tooLong")),
    email: Yup.string()
        .email(i18n.t("inputErrors.email"))
        .required(i18n.t("inputErrors.required")),
});

const UserModal = ({ open, onClose, userId }) => {
    const classes = useStyles();

    const initialState = {
        name: "",
        email: "",
        password: "",
        profile: "user",
        allTicket: "disabled",
        startWork: "",
        endWork: "",
        spy: "disabled",
        isTricked: "enabled",
		defaultMenu: "open",
    };

    const { user: loggedInUser } = useContext(AuthContext);

    const [user, setUser] = useState(initialState);
    const [superUser, setSuperUser] = useState(false);
    const [selectedQueueIds, setSelectedQueueIds] = useState([]);
    const [showPassword, setShowPassword] = useState(false);
    const [whatsappId, setWhatsappId] = useState(false);
    const { loading, whatsApps } = useWhatsApps();
    const startWorkRef = useRef();
    const endWorkRef = useRef();
    const history = useHistory();
    const [fetchError, setFetchError] = useState(null);
    const [saveError, setSaveError] = useState(null);
	const [activeTab, setActiveTab] = useState(0);


    useEffect(() => {
        const fetchUser = async () => {
            if (!userId) return;
            try {
                const { data } = await api.get(`/users/${userId}`);
                setUser(prevState => {
                    return { ...prevState, ...data };
                });
                const userQueueIds = data.queues?.map(queue => queue.id);
                setSelectedQueueIds(userQueueIds);
                setWhatsappId(data.whatsappId ? data.whatsappId : '');
                setSuperUser(data.super);
            } catch (err) {
                toastError(err);
                setFetchError('Failed to fetch user data.');
            }
        };

        fetchUser();
    }, [userId, open]);

    const handleClose = () => {
        onClose();
        setUser(initialState);
        setFetchError(null);
        setSaveError(null);
    };

    const handleSaveUser = async values => {
        const userData = { ...values, whatsappId, queueIds: selectedQueueIds, super: superUser };
        try {
            if (userId) {
                await api.put(`/users/${userId}`, userData);
            } else {
                await api.post("/users", userData);
            }
            toast.success(i18n.t("userModal.success"));
            history.go(0);
        } catch (err) {
            toastError(err);
            setSaveError('Failed to save user data.');
        }
        handleClose();
    };

    const handleSwitchChange = (event) => {
        setSuperUser(event.target.checked);
    };

	const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
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
                    {userId
                        ? `${i18n.t("userModal.title.edit")}`
                        : `${i18n.t("userModal.title.add")}`}
                </DialogTitle>
                <div className={classes.tabsContainer}>

                    {(loggedInUser.profile == 'admin' || loggedInUser.profile == 'supervisor') && (
                        <Tabs
                            value={activeTab}
                            onChange={handleTabChange}
                            aria-label="user form tabs"
                            TabIndicatorProps={{ style: { justifyContent: "center" } }}
                        >
                            <Tab label={i18n.t("userModal.tabs.info")} />
                            <Tab label={i18n.t("userModal.tabs.permission")} />
                        </Tabs>
                    )}
                </div>
				<Formik
					initialValues={user}
					enableReinitialize={true}
					validationSchema={UserSchema}
					onSubmit={(values, actions) => {
						setTimeout(() => {
							handleSaveUser(values);
							actions.setSubmitting(false);
						}, 400);
					}}
				>
					{({ touched, errors, isSubmitting }) => (
						<Form>
							<DialogContent dividers>
								{fetchError && (
									<div style={{ color: 'red', marginBottom: '10px' }}>
										{fetchError}
									</div>
								)}
								{activeTab === 0 && (
									<div>
										<div className={classes.multFieldLine}>
											<Field
												as={TextField}
												label={i18n.t("userModal.form.name")}
												autoFocus
												name="name"
												error={touched.name && Boolean(errors.name)}
												helperText={touched.name && errors.name}
												variant="outlined"
												margin="dense"
												fullWidth
											/>
												<Can
													role={loggedInUser.profile}
													perform="user-modal:editPassword"
													yes={() => (
														<>
															<Field
																as={TextField}
																name="password"
																variant="outlined"
																margin="dense"
																fullWidth
																label={i18n.t("userModal.form.password")}
																error={touched.password && Boolean(errors.password)}
																helperText={touched.password && errors.password}
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
															/>
														</>
													)}
												/>
										</div>
										<div className={classes.multFieldLine}>
											<Field
												as={TextField}
												label={i18n.t("userModal.form.email")}
												name="email"
												error={touched.email && Boolean(errors.email)}
												helperText={touched.email && errors.email}
												variant="outlined"
												margin="dense"
												fullWidth
											/>
											<FormControl
												variant="outlined"
												className={classes.formControl}
												margin="dense"
											>
												<Can
													role={loggedInUser.profile}
													perform="user-modal:editProfile"
													yes={() => (
														<>
															<InputLabel id="profile-selection-input-label">
																{i18n.t("userModal.form.profile")}
															</InputLabel>
	
															<Field
																as={Select}
																label={i18n.t("userModal.form.profile")}
																name="profile"
																labelId="profile-selection-label"
																id="profile-selection"
																required
															>
																<MenuItem value="admin">Admin</MenuItem>
																<MenuItem value="superv">Supervisor</MenuItem>
																<MenuItem value="user">User</MenuItem>
															</Field>
														</>
													)}
												/>
											</FormControl>									
										</div>
										<Can
											role={loggedInUser.profile}
											perform="user-modal:editQueues"
											yes={() => (
												<QueueSelect
													selectedQueueIds={selectedQueueIds}
													onChange={values => setSelectedQueueIds(values)}
												/>
											)}
										/>
										<Can
											role={loggedInUser.profile}
											perform="user-modal:editWhatsApp"
											yes={() => (
												<FormControl variant="outlined" margin="dense" className={classes.maxWidth} fullWidth>
													<InputLabel>
														{i18n.t("userModal.form.whatsapp")}
													</InputLabel>
													<Field
														as={Select}	
														value={whatsappId}
														onChange={(e) => setWhatsappId(e.target.value)}
														label={i18n.t("userModal.form.whatsapp")}
													>
														<MenuItem value={''}>&nbsp;</MenuItem>
														{whatsApps.map((whatsapp) => (
															<MenuItem key={whatsapp.id} value={whatsapp.id}>{whatsapp.name}</MenuItem>
														))}
													</Field>
												</FormControl>
											)}
										/>
										<Can
											role={loggedInUser.profile}
											perform="user-modal:editDetails"
											yes={() => (!loading &&
												<form className={classes.container} noValidate>
													<Field
														as={TextField}
														label={i18n.t("userModal.form.startWork")}
														type="time"
														ampm={false}
														defaultValue="00:00"
														inputRef={startWorkRef}
														InputLabelProps={{
															shrink: true,
														}}
														inputProps={{
															step: 600, // 5 min
														}}
														fullWidth
														name="startWork"
														error={
															touched.startWork && Boolean(errors.startWork)
														}
														helperText={
															touched.startWork && errors.startWork
														}
														variant="outlined"
														margin="dense"
														className={classes.textField}
													/>
													<Field
														as={TextField}
														label={i18n.t("userModal.form.endWork")}
														type="time"
														ampm={false}
														defaultValue="23:59"
														inputRef={endWorkRef}
														InputLabelProps={{
															shrink: true,
														}}
														inputProps={{
															step: 600, // 5 min
														}}
														fullWidth
														name="endWork"
														error={
															touched.endWork && Boolean(errors.endWork)
														}
														helperText={
															touched.endWork && errors.endWork
														}
														variant="outlined"
														margin="dense"
														className={classes.textField}
													/>
												</form>
											)}
										/>
										<FormControl
											variant="outlined"
											className={classes.maxWidth}
											margin="dense"
											fullWidth
										>
											<>
												<InputLabel >
													{i18n.t("userModal.form.defaultMenu")}
												</InputLabel>

												<Field
													as={Select}
													label={i18n.t("userModal.form.defaultMenu")}
													name="defaultMenu"
													type="defaultMenu"
													required
												>
													<MenuItem value={"open"}>{i18n.t("userModal.form.defaultMenuOpen")}</MenuItem>
													<MenuItem value={"closed"}>{i18n.t("userModal.form.defaultMenuClosed")}</MenuItem>
												</Field>
											</>
										</FormControl>
									</div>
								)}
								{activeTab === 1 && (
									<div>
										<FormControl
											variant="outlined"
											className={classes.formControl}
											margin="dense"
											fullWidth
											style={{ marginLeft: 0 }}
										>
											<Can
												role={loggedInUser.profile}
												perform="user-modal:editIsTricked"
												yes={() => (
													<>
														<InputLabel id="isTricked-selection-input-label">
															{i18n.t("userModal.form.isTricked")}
														</InputLabel>
														<Field
															as={Select}
															label={i18n.t("userModal.form.isTricked")}
															name="isTricked"
															labelId="isTricked-selection-label"
															id="isTricked-selection"
														>
															<MenuItem value="enabled">{i18n.t("userModal.form.enabled")}</MenuItem>
															<MenuItem value="disabled">{i18n.t("userModal.form.disabled")}</MenuItem>
														</Field>
													</>
												)}
											/>
										</FormControl>
										<FormControl
											variant="outlined"
											className={classes.formControl}
											margin="dense"
											fullWidth
											style={{ marginLeft: 0 }}
										>
											<Can
												role={loggedInUser.profile}
												perform="user-modal:editSpy"
												yes={() => (
													<>
														<InputLabel id="spy-selection-input-label">
															{i18n.t("userModal.form.spy")}
														</InputLabel>
														<Field
															as={Select}
															label={i18n.t("userModal.form.spy")}
															name="spy"
															labelId="spy-selection-label"
															id="spy-selection"
														>
															<MenuItem value="enabled">{i18n.t("userModal.form.enabled")}</MenuItem>
															<MenuItem value="disabled">{i18n.t("userModal.form.disabled")}</MenuItem>
														</Field>
													</>
												)}
											/>
										</FormControl>
										<Can
											role={loggedInUser.profile}
											perform="user-modal:editViewAllTicket"
											yes={() => (
												<>
													<FormControl
														variant="outlined"
														className={classes.maxWidth}
														margin="dense"
														fullWidth
													>
														<>
															<InputLabel>
																{i18n.t("userModal.form.allTicket")}
															</InputLabel>
															<Field
																as={Select}
																label={i18n.t("userModal.form.allTicket")}
																name="allTicket"
																type="allTicket"
																required
															>
																<MenuItem value="enabled">{i18n.t("userModal.form.enabled")}</MenuItem>
																<MenuItem value="disabled">{i18n.t("userModal.form.disabled")}</MenuItem>
															</Field>
														</>
													</FormControl>
												</>
											)}
										/>
										{loggedInUser.super && (
											<FormControlLabel
												control={
													<Switch
														checked={superUser}
														onChange={handleSwitchChange}
														name="superUserSwitch"
														color="primary"
													/>
												}
												label="Super User"
											/>
										)}
									</div>
								)}
								{saveError && (
									<div style={{ color: 'red', marginTop: '10px' }}>
										{saveError}
									</div>
								)}
							</DialogContent>
							<DialogActions>
								<Button
									onClick={handleClose}
									color="secondary"
									disabled={isSubmitting}
									variant="outlined"
								>
									{i18n.t("userModal.buttons.cancel")}
								</Button>
								<Button
									type="submit"
									color="primary"
									disabled={isSubmitting}
									variant="contained"
									className={classes.btnWrapper}
								>
									{userId
										? `${i18n.t("userModal.buttons.okEdit")}`
										: `${i18n.t("userModal.buttons.okAdd")}`}
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

export default UserModal;