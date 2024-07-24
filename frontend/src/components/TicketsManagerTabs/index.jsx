import React, {useContext, useEffect, useRef, useState} from "react";
import {useHistory} from "react-router-dom";

import {makeStyles} from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import InputBase from "@material-ui/core/InputBase";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Badge from "@material-ui/core/Badge";
import GroupIcon from "@material-ui/icons/Group";
import {
    Group,
    MoveToInbox as MoveToInboxIcon,
    CheckBox as CheckBoxIcon,
    MessageSharp as MessageSharpIcon,
    PlaylistAddCheckOutlined as PlaylistAddCheckOutlinedIcon,
    AccessTime as ClockIcon,
    Search as SearchIcon,
    Add as AddIcon,
} from "@material-ui/icons";
import {Snackbar} from "@material-ui/core";

import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";

import Divider from "@material-ui/core/Divider";
import ListSubheader from "@material-ui/core/ListSubheader";

import NewTicketModal from "../NewTicketModal";
import TicketsList from "../TicketsListCustom";
import TicketsListGroup from "../TicketsListGroup";
import TabPanel from "../TabPanel";

import {i18n} from "../../translate/i18n";
import {AuthContext} from "../../context/Auth/AuthContext";
import {Can} from "../Can";
import TicketsQueueSelect from "../TicketsQueueSelect";
import {Button} from "@material-ui/core";
import {TagsFilter} from "../TagsFilter";
import {UsersFilter} from "../UsersFilter";
import useSettings from "../../hooks/useSettings";
import IconButton from "@material-ui/core/IconButton";
import api from "../../services/api";
import {QueueSelectedContext} from "../../context/QueuesSelected/QueuesSelectedContext";
import VisibilityIcon from "@material-ui/icons/Visibility";
import VisibilityOffIcon from "@material-ui/icons/VisibilityOff";
import {ToggleButton} from "@material-ui/lab";

const useStyles = makeStyles(theme => ({
    ticketsWrapper: {
        position: "relative",
        display: "flex",
        height: "100%",
        flexDirection: "column",
        overflow: "hidden",
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
        borderRadius: 0,
    },

    tabsHeader: {
        flex: "none",
        backgroundColor: theme.palette.tabHeaderBackground,
    },

    tabsInternal: {
        flex: "none",
        backgroundColor: theme.palette.tabHeaderBackground
    },

    settingsIcon: {
        alignSelf: "center",
        marginLeft: "auto",
        padding: 8,
    },

    tab: {
        minWidth: "25%",
        width: "33%",
    },

    internalTab: {
        minWidth: 120,
        width: 120,
        padding: 5
    },

    ticketOptionsBox: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: theme.palette.optionsBackground,
        padding: theme.spacing(1),
    },

    ticketSearchLine: {
        padding: theme.spacing(1),
    },

    serachInputWrapper: {
        flex: 1,
        background: theme.palette.total,
        display: "flex",
        borderRadius: 40,
        padding: 4,
        marginRight: theme.spacing(1),
    },

    searchIcon: {
        color: "grey",
        marginLeft: 6,
        marginRight: 6,
        alignSelf: "center",
    },

    searchInput: {
        flex: 1,
        border: "none",
        borderRadius: 30,
    },

    insiderTabPanel: {
        height: '100%',
        marginTop: "-72px",
        paddingTop: "72px"
    },

    insiderDoubleTabPanel: {
        display: "flex",
        flexDirection: "column",
        marginTop: "-72px",
        paddingTop: "72px",
        height: "100%"
    },

    snackbar: {
        display: "flex",
        justifyContent: "space-between",
        backgroundColor: theme.palette.primary.main,
        color: "white",
        borderRadius: 30,
        [theme.breakpoints.down("sm")]: {
            fontSize: "0.8em",
        },
        [theme.breakpoints.up("md")]: {
            fontSize: "1em",
        },
    },

    labelContainer: {
        width: "auto",
        padding: 0
    },
    iconLabelWrapper: {
        flexDirection: "row",
        '& > *:first-child': {
            marginBottom: '3px !important',
            marginRight: 16
        }
    },
    insiderTabLabel: {
        [theme.breakpoints.down(1600)]: {
            display: 'none'
        }
    },
    smallFormControl: {
        '& .MuiOutlinedInput-input': {
            padding: "12px 10px",
        },
        '& .MuiInputLabel-outlined': {
            marginTop: "-6px"
        }
    }
}));

const TicketsManagerTabs = () => {
    const classes = useStyles();
    const history = useHistory();

    const [searchParam, setSearchParam] = useState("");
    const [tab, setTab] = useState("open");
    const [tabOpen, setTabOpen] = useState("open");
    const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
    const [showAllTickets, setShowAllTickets] = useState(false);
    const searchInputRef = useRef();
    const {user} = useContext(AuthContext);
    const {profile} = user;
    const { settings } = useSettings();
    const [showGroupTab, setShowGroupTab] = useState(false);
    const [activeSubTab, setActiveSubTab] = useState("private");

    const {setSelectedQueuesMessage} = useContext(QueueSelectedContext);

    const [openCount, setOpenCount] = useState(0);
    const [groupOpenCount, setGroupOpenCount] = useState(0);
    const [groupPendingCount, setGroupPendingCount] = useState(0);
    const [pendingCount, setPendingCount] = useState(0);
    //const [chatbotCount, setChatbotCount] = useState(0);
    const userQueueIds = user.queues.map((q) => q.id);
    const [selectedQueueIds, setSelectedQueueIds] = useState(userQueueIds || []);
    const [selectedTags, setSelectedTags] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [snackbarOpen, setSnackbarOpen] = useState(false);

    const [hoveredButton, setHoveredButton] = useState(null);
    const [isHoveredAll, setIsHoveredAll] = useState(false);
    const [isHoveredNew, setIsHoveredNew] = useState(false);
    const [isHoveredResolve, setIsHoveredResolve] = useState(false);
    const [isHoveredOpen, setIsHoveredOpen] = useState(false);
    const [isHoveredClosed, setIsHoveredClosed] = useState(false);
    const [isFilterActive, setIsFilterActive] = useState(false);;

    useEffect(() => {

        setSelectedQueuesMessage(selectedQueueIds);

        // Ativa a exibição de todos os tickets para administradores
        if (user.profile.toUpperCase() === "ADMIN") {
            setShowAllTickets(true);
        }
    
        // Foca o input de pesquisa quando a aba de pesquisa é selecionada
        if (tab === "search") {
            searchInputRef.current.focus();
        }
    
        // Configura a exibição da aba de grupo baseada nas configurações
        api.get(`/settings`).then(({ data }) => {
            if (Array.isArray(data)) {
              const checkMsgIsGroupSetting = data.find((d) => d.key === "CheckMsgIsGroup");
              if (checkMsgIsGroupSetting) {
                setShowGroupTab(checkMsgIsGroupSetting.value === "disabled");
                }
            }
        })
    }, [selectedQueueIds, user.profile, tab, settings]); // Dependências atualizadas para refletir todos os estados usados dentro do useEffect
    

    let searchTimeout;

    const handleSearch = (e) => {
        const searchedTerm = e.target.value.toLowerCase();

        clearTimeout(searchTimeout);

        if (searchedTerm === "") {
            setSearchParam(searchedTerm);
            setTab("open");
            return;
        }

        searchTimeout = setTimeout(() => {
            setSearchParam(searchedTerm);
        }, 500);
    };

    const handleChangeTab = (e, newValue) => {
        setTab(newValue);
    };

    const handleChangeSubTab = (e, newValue) => {
        setActiveSubTab(newValue);
    };

    const handleChangeTabOpen = (e, newValue) => {
        setTabOpen(newValue);
    };

    const applyPanelStyle = (status) => {
        if (tabOpen !== status) {
            return {width: 0, height: 0};
        }
    };

    const CloseAllTicket = async () => {
        try {
            const {data} = await api.post("/tickets/closeAll", {
                status: tabOpen,
                selectedQueueIds,
            });
            handleSnackbarClose();
        } catch (err) {
            console.log("Error: ", err);
        }
    };
    const handleCloseOrOpenTicket = (ticket) => {
        setNewTicketModalOpen(false);
        if (ticket !== undefined && ticket.uuid !== undefined) {
            history.push(`/tickets/${ticket.uuid}`);
        }
    };

    const handleSnackbarOpen = () => {
        setSnackbarOpen(true);
    };

    const handleSnackbarClose = () => {
        setSnackbarOpen(false);
    };
    const handleSelectedTags = (selecteds) => {
        const tags = selecteds.map((t) => t.id);
        setSelectedTags(tags);
    };

    const handleSelectedUsers = (selecteds) => {
        const users = selecteds.map((t) => t.id);
        setSelectedUsers(users);
    };

    return (
        <Paper elevation={0} variant="outlined" className={classes.ticketsWrapper}>
            <NewTicketModal
                modalOpen={newTicketModalOpen}
                onClose={(ticket) => {

                    handleCloseOrOpenTicket(ticket);
                }}
            />
            <Paper elevation={0} square className={classes.tabsHeader}>
                <Tabs
                    classKey={'centered'}
                    value={tab}
                    onChange={handleChangeTab}
                    //centered={true}

                    variant="scrollable"
                    indicatorColor="primary"
                    textColor="primary"
                    aria-label="icon label tabs example"
                >
                    <Tab
                        value={"open"}
                        icon={<MoveToInboxIcon/>}
                        label={
                            <Badge
                                className={classes.badge}
                                badgeContent={openCount + pendingCount}
                                color="primary"
                            >
                                {i18n.t("tickets.tabs.open.title")}
                            </Badge>
                        }
                        classes={{root: classes.tab}}
                    />
                    {showGroupTab && (
                    <Tab
                        value={"group"}
                        icon={<GroupIcon />}
                        label={
                            <Badge className={classes.badge} badgeContent={groupOpenCount + groupPendingCount} color="primary">
                                {i18n.t("tickets.tabs.group.title")}
                            </Badge>
                        }
                        classes={{ root: classes.tab }}
                    />
                    )}
                    <Tab
                        value={"closed"}
                        icon={<CheckBoxIcon/>}
                        label={i18n.t("tickets.tabs.closed.title")}
                        classes={{root: classes.tab}}
                    />
                    <Tab
                        value={"search"}
                        icon={<SearchIcon/>}
                        label={i18n.t("tickets.tabs.search.title")}
                        classes={{root: classes.tab}}
                    />
                </Tabs>
            </Paper>
            <Paper square elevation={0} className={classes.ticketOptionsBox}>
                <div>
                    {tab === "search" ? (
                        <div className={classes.serachInputWrapper}>
                            <SearchIcon className={classes.searchIcon}/>
                            <InputBase
                                className={classes.searchInput}
                                inputRef={searchInputRef}
                                placeholder={i18n.t("tickets.search.placeholder")}
                                type="search"
                                onChange={handleSearch}
                            />
                        </div>
                    ) : (
                        <>


                            <Snackbar
                                open={snackbarOpen}
                                onClose={handleSnackbarClose}
                                message={i18n.t("tickets.inbox.closedAllTickets")}
                                ContentProps={{
                                    className: classes.snackbar,
                                }}
                                action={
                                    <>
                                        <Button
                                            className={classes.yesButton}
                                            size="small"
                                            onClick={CloseAllTicket}
                                        >
                                            {i18n.t("tickets.inbox.yes")}
                                        </Button>
                                        <Button
                                            className={classes.noButton}
                                            size="small"
                                            onClick={handleSnackbarClose}
                                        >
                                            {i18n.t("tickets.inbox.no")}
                                        </Button>
                                    </>
                                }
                            />
                            <Can
                                role={user.allUserChat === 'enabled' && user.profile === 'user' ? 'admin' : user.profile}
                                perform="tickets-manager:showall"
                                yes={() => (
                                    <Badge
                                        color="primary"
                                        invisible={
                                            !isHoveredAll ||
                                            isHoveredNew ||
                                            isHoveredResolve ||
                                            isHoveredOpen ||
                                            isHoveredClosed
                                        }
                                        badgeContent={"Todos"}
                                        classes={{badge: classes.tabsBadge}}
                                    >
                                        <ToggleButton
                                            onMouseEnter={() => setIsHoveredAll(true)}
                                            onMouseLeave={() => setIsHoveredAll(false)}
                                            className={classes.button}
                                            value="uncheck"
                                            selected={showAllTickets}
                                            onChange={() =>
                                                setShowAllTickets((prevState) => !prevState)
                                            }
                                        >
                                            {showAllTickets ? (
                                                <VisibilityIcon className={classes.icon}/>
                                            ) : (
                                                <VisibilityOffIcon className={classes.icon}/>
                                            )}
                                        </ToggleButton>
                                    </Badge>
                                )}
                            />
                            <Badge
                                color="primary"
                                invisible={
                                    isHoveredAll ||
                                    !isHoveredNew ||
                                    isHoveredResolve ||
                                    isHoveredOpen ||
                                    isHoveredClosed
                                }
                                badgeContent={i18n.t("ticketsManager.buttons.newTicket")}
                                classes={{badge: classes.tabsBadge}}
                            >
                                <IconButton
                                    onMouseEnter={() => setIsHoveredNew(true)}
                                    onMouseLeave={() => setIsHoveredNew(false)}
                                    className={classes.button}
                                    onClick={() => {
                                        setNewTicketModalOpen(true);
                                    }}
                                >
                                    <AddIcon className={classes.icon}/>
                                </IconButton>
                            </Badge>

                            {user.profile === "admin" && (
                                <Badge
                                    color="primary"
                                    invisible={
                                        isHoveredAll ||
                                        isHoveredNew ||
                                        !isHoveredResolve ||
                                        isHoveredOpen ||
                                        isHoveredClosed
                                    }
                                    badgeContent={i18n.t("tickets.inbox.closedAll")}
                                    classes={{badge: classes.tabsBadge}}
                                >
                                    <IconButton
                                        onMouseEnter={() => setIsHoveredResolve(true)}
                                        onMouseLeave={() => setIsHoveredResolve(false)}
                                        className={classes.button}
                                        onClick={handleSnackbarOpen}
                                    >
                                        <PlaylistAddCheckOutlinedIcon style={{color: "green"}}/>
                                    </IconButton>
                                </Badge>
                            )}

                        </>
                    )}
                </div>
                <TicketsQueueSelect
                    style={{marginLeft: 6}}
                    selectedQueueIds={selectedQueueIds}
                    userQueues={user?.queues}
                    onChange={(values) => setSelectedQueueIds(values)}
                />
            </Paper>
            <TabPanel value={tab} name="open" className={classes.ticketsWrapper}>
                <Tabs
                    value={tabOpen}
                    onChange={handleChangeTabOpen}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="fullWidth"
                >
                    <Tab
                        label={
                            <Badge
                                className={classes.badge}
                                badgeContent={openCount}
                                color="primary"
                            >
                                {i18n.t("ticketsList.assignedHeader")}
                            </Badge>
                        }
                        value={"open"}
                    />
                    <Tab
                        label={
                            <Badge
                                className={classes.badge}
                                badgeContent={pendingCount}
                                color="secondary"
                            >
                                {i18n.t("ticketsList.pendingHeader")}
                            </Badge>
                        }
                        value={"pending"}
                    />
                </Tabs>
                <Paper className={classes.ticketsWrapper}>
                    <TicketsList
                        status="open"
                        setTabOpen={setTabOpen}
                        showAll={showAllTickets}
                        selectedQueueIds={selectedQueueIds}
                        updateCount={(val) => setOpenCount(val)}
                        updateGroupCount={(val) => setGroupOpenCount(val)}
                        style={applyPanelStyle("open")}
                    />

                    <TicketsList
                        chatbot={false}
                        status="pending"
                        setTabOpen={setTabOpen}
                        selectedQueueIds={selectedQueueIds}
                        updateGroupCount={(val) => setGroupPendingCount(val)}
                        updateCount={(val) => setPendingCount(val)}
                        style={applyPanelStyle("pending")}
                    />
                </Paper>
            </TabPanel>
            <TabPanel value={tab} name="group" className={classes.ticketsWrapper}>
                <Tabs
                    value={tabOpen}
                    onChange={handleChangeTabOpen}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="fullWidth"
                >
                    <Tab
                        label={
                            <Badge
                                className={classes.badge}
                                badgeContent={groupOpenCount}
                                color="primary"
                            >
                                {i18n.t("ticketsList.assignedHeader")}
                            </Badge>
                        }
                        value={"open"}
                    />
                    <Tab
                        label={
                            <Badge
                                className={classes.badge}
                                badgeContent={groupPendingCount}
                                color="secondary"
                            >
                                {i18n.t("ticketsList.pendingHeader")}
                            </Badge>
                        }
                        value={"pending"}
                    />
                </Tabs>
                <Paper className={classes.ticketsWrapper}>
                    <TicketsListGroup
                        status="open"
                        setTabOpen={setTabOpen}
                        showAll={showAllTickets}
                        selectedQueueIds={selectedQueueIds}
                        updateCount={(val) => {
                            setGroupOpenCount(val);
                        }
                        }
                        style={applyPanelStyle("open")}
                    />
                    <TicketsListGroup
                        status="pending"
                        setTabOpen={setTabOpen}
                        selectedQueueIds={selectedQueueIds}
                        updateCount={(val) => setGroupPendingCount(val)}
                        style={applyPanelStyle("pending")}
                    />
                </Paper>
            </TabPanel>
            {profile === "admin" && (
                <TabPanel value={tab} name="closed" className={classes.ticketsWrapper}>
                <Tabs
                    value={activeSubTab}
                    onChange={handleChangeSubTab}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="fullWidth"
                >
                    <Tab
                        label={i18n.t("tickets.tabs.private.title")}
                        value={"private"}
                    />
                {showGroupTab && (
                    <Tab
                        label={i18n.t("tickets.tabs.group.title")}
                        value={"group"}
                    />
                )}
                </Tabs>
                <Divider />
                {activeSubTab === "private" && (
                    <TicketsList
                        status="closed"
                        showAll={showAllTickets}
                        selectedQueueIds={selectedQueueIds}
                    />
                )}
                {activeSubTab === "group" && (
                    <>
                        <Divider />
                        <TicketsListGroup
                            status="closed"
                            showAll={true}
                            selectedQueueIds={selectedQueueIds}
                        />
                    </>
                )}
            </TabPanel>
            )}
            <TabPanel value={tab} name="search" className={classes.ticketsWrapper}>
                <TagsFilter onFiltered={handleSelectedTags}/>
                {profile === "admin" && (
                    <UsersFilter onFiltered={handleSelectedUsers}/>
                )}
                <TicketsList
                    searchParam={searchParam}
                    showAll={true}
                    tags={selectedTags}
                    users={selectedUsers}
                    selectedQueueIds={selectedQueueIds}
                />
            </TabPanel>
        </Paper>
    );
};

export default TicketsManagerTabs;