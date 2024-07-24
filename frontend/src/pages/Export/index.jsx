import React, {useState, useCallback, useContext} from 'react';
import {useQuery, useQueryClient} from 'react-query';
import {useHistory} from 'react-router-dom';
import {toast} from 'react-toastify';

import {Box, Checkbox, FormControl, ListItemText} from '@material-ui/core';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Paper from '@material-ui/core/Paper';
import {makeStyles} from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TextField from '@material-ui/core/TextField';
import {ChevronLeft} from '@material-ui/icons';
import PdfIcon from '@material-ui/icons/PictureAsPdf';
import {Pagination} from '@material-ui/lab';

import {format, parseISO} from 'date-fns';
import Container from "@material-ui/core/Container";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import {i18n} from "../../translate/i18n";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import api from "../../services/api";
import {AuthContext} from "../../context/Auth/AuthContext";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import InputLabel from "@material-ui/core/InputLabel";

const useStyles = makeStyles((theme) => ({
    mainPaper: {
        flex: 1,
        overflowY: 'scroll',
        padding: theme.spacing(1),
        ...theme.scrollbarStyles,
    },
    toolbarIcon: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0',
        minHeight: '48px',
    },
}));

const Export = () => {
    const classes = useStyles();
    const history = useHistory();
    const {user} = useContext(AuthContext);
    const {profile, queues, allTicket} = user;


    const [dateStartParam, setDateStartParam] = useState('');
    const [dateEndParam, setDateEndParam] = useState('');
    const [totalPages, setTotalPages] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(50);
    const [totalData, setTotalData] = useState(0);

    const [exportLoading, setexportLoading] = useState(false);


    const [filterData, setFilterData] = useState({
        dateStart: new Date().toISOString().split('T')[0],
        dateEnd: //tomorrow date
            new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        queueId: null,
        status: null,
    });


    const handleExport = async (act) => {
        setexportLoading(true);
        try {
            const response = await api.post(`/report/${act}`, {
                dateStart: filterData.dateStart,
                dateEnd: filterData.dateEnd,
                queueId: filterData.queueId,
                status: filterData.status,
            });

            var parsedTickets = response.data;
            if (!parsedTickets.length) {
                toast.info('Nenhum ticket encontrado');
                return;
            }
            const headers = Object.keys(parsedTickets[0]).join(',');
            //generate csv rows based on the object values
            const rows = parsedTickets.map(ticket => Object.values(ticket).join(','));
            //join headers and rows
            const csv = [headers, ...rows].join('\n');
            // make the download of the csv file
            const blob = new Blob([csv], {type: 'text/csv'});
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${act}-${new Date().toDateString()}.csv`;
            a.click();
        } catch (error) {
            console.log(error);
            toast.error('Erro ao exportar relatório');
        } finally {
            setexportLoading(false);
        }
    }

    const handleBack = () => {
        history.goBack();
    };


    return (
        <Container className={classes.mainContainer}>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    width: '50px',
                }}
            >
                <div className={classes.toolbarIcon}>
                    <IconButton onClick={handleBack}>
                        <ChevronLeft/>
                        <span style={{fontSize: '1rem'}}>Voltar</span>
                    </IconButton>
                </div>
            </Box>
            <MainHeader>
                <Title>Exportar relatórios</Title>

                <MainHeaderButtonsWrapper>

                </MainHeaderButtonsWrapper>
            </MainHeader>
            <Paper className={classes.mainPaper} variant="outlined">
                <div className={'flex flex-column'}>
                    <div className={'flex items-center justify-between gap-2'}>
                        <TextField
                            onChange={(event) => setFilterData({
                                ...filterData,
                                dateStart: event.target.value
                            })}
                            type="date"
                            fullWidth={true}
                            label={i18n.t("dashboard.date.initialDate")}
                            margin="normal"
                            variant="outlined"
                            value={filterData.dateStart}
                        />

                        <TextField
                            onChange={(event) =>
                                setFilterData({
                                    ...filterData,
                                    dateEnd: event.target.value
                                })}
                            fullWidth={true}
                            type="date"
                            margin="normal"
                            variant="outlined"
                            label={i18n.t("dashboard.date.finalDate")}
                            value={filterData.dateEnd}
                        />
                        <FormControl
                            variant="outlined"
                            margin="normal"
                            fullWidth
                            className={classes.formControl}
                        >
                            <Select
                                displayEmpty
                                variant="outlined"
                                margin="normal"
                                fullWidth={true}
                                value={filterData.queueId}
                                onChange={(e) => setFilterData({
                                    ...filterData,
                                    queueId: e.target.value
                                })}
                                MenuProps={{
                                    anchorOrigin: {
                                        vertical: "bottom",
                                        horizontal: "left",
                                    },
                                    transformOrigin: {
                                        vertical: "top",
                                        horizontal: "left",
                                    },
                                    getContentAnchorEl: null,
                                }}
                                renderValue={() => queues?.find(queue => queue.id === filterData.queueId)?.name || "Todas filas"}
                            >
                                <MenuItem value={null}><Checkbox checked={!filterData.queueId}/>
                                    Todas as filas
                                </MenuItem>
                                {queues?.length > 0 &&
                                    queues.map(queue => (
                                        <MenuItem dense key={queue.id} value={queue.id}>
                                            <Checkbox
                                                style={{
                                                    color: queue.color,
                                                }}
                                                size="small"
                                                color="primary"
                                                checked={filterData.queueId === queue.id}
                                            />
                                            <ListItemText primary={queue.name}/>
                                        </MenuItem>
                                    ))}
                            </Select>
                        </FormControl>
                        <FormControl
                            variant="outlined"
                            margin="normal"
                            fullWidth
                            className={classes.formControl}
                        >
                            <Select
                                margin="normal"
                                displayEmpty
                                fullWidth={true}
                                variant="outlined"
                                value={filterData.status}
                                onChange={(e) => setFilterData({
                                    ...filterData,
                                    status: e.target.value
                                })}
                                MenuProps={{
                                    anchorOrigin: {
                                        vertical: "bottom",
                                        horizontal: "left",
                                    },
                                    transformOrigin: {
                                        vertical: "top",
                                        horizontal: "left",
                                    },
                                    getContentAnchorEl: null,
                                }}
                                renderValue={() => {
                                    switch (filterData.status) {
                                        case "open":
                                            return "Abertos";
                                        case "closed":
                                            return "Fechados";
                                        case "pending":
                                            return "Pendentes";
                                        default:
                                            return "Todos Status";

                                }
                                }}
                            >
                                <MenuItem value={null}><Checkbox checked={!filterData.status}/>
                                    Todos os status
                                </MenuItem>
                                <MenuItem dense key="open" value={"open"}>
                                    <Checkbox
                                        style={{
                                            color: 'green',
                                        }}
                                        size="small"
                                        color="primary"
                                        checked={filterData.status === "open"}
                                    />
                                    <ListItemText primary={"Abertos"}/>
                                </MenuItem>
                                <MenuItem dense key="closed" value={"closed"}>
                                    <Checkbox
                                        style={{
                                            color: 'red',
                                        }}
                                        size="small"
                                        color="primary"
                                        checked={filterData.status === "closed"}
                                    />
                                    <ListItemText primary={"Fechados"}/>
                                </MenuItem>

                                <MenuItem dense key={"pending"} value={"pending"}>
                                    <Checkbox
                                        style={{
                                            color: 'yellow',
                                        }}
                                        size="small"
                                        color="primary"
                                        checked={filterData.status === "pending"}
                                    />
                                    <ListItemText primary={"Pendentes"}/>
                                </MenuItem>


                            </Select>
                        </FormControl>
                    </div>

                    <Button
                        disabled={exportLoading}
                        onClick={() => handleExport('tickets')}
                        color="primary"
                        variant="contained"
                    >
                        Exportar Tickets
                    </Button>
                </div>
            </Paper>

        </Container>
    );
};

export default Export;