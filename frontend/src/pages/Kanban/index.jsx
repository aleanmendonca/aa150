import React, {useState, useEffect, useReducer, useContext, useCallback} from "react";
import {makeStyles} from "@material-ui/core/styles";
import api from "../../services/api";
import {AuthContext} from "../../context/Auth/AuthContext";
import Board from 'react-trello';
import {toast} from "react-toastify";
import {i18n} from "../../translate/i18n";
import {useHistory} from 'react-router-dom';
import SearchIcon from "@material-ui/icons/Search";
import Paper from "@material-ui/core/Paper";
import InputBase from "@material-ui/core/InputBase";
import Avatar from "@material-ui/core/Avatar";
import Tooltip from "@material-ui/core/Tooltip";
import Grid from "@material-ui/core/Grid";
import IconButton from "@material-ui/core/IconButton";
import SettingsIcon from "@material-ui/icons/Settings";
import InstructionsModal from "./info"
import BoardSettingsModal from "../../components/kanbanModal";
import WhatsAppIcon from '@material-ui/icons/WhatsApp';

import "./style.css"; // Importe o arquivo CSS
const useStyles = makeStyles(theme => ({
    root: {
        display: "flex", alignItems: "center", padding: theme.spacing(1),
    },
    button: {
        background: "#10a110", border: "none",
        padding: "10px",
        color: "white",
        fontWeight: "bold",
        borderRadius: "5px",
    },

}));

const Kanban = () => {
    const classes = useStyles();
    const history = useHistory();

    const { user } = useContext(AuthContext);
    const { profile, queues } = user;
    const jsonString = user.queues.map(queue => queue.UserQueue.queueId);

    const [tags, setTags] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [reloadData, setReloadData] = useState(false);
    const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [settingsModalOpen, setSettingsModalOpen] = useState(false);

    const handleOpenBoardSettings = () => {
        setSettingsModalOpen(true);
    };

    const fetchTags = async () => {
        try {
            const response = await api.get("/tags/kanban");
            const fetchedTags = response.data.lista || [];

            setTags(fetchedTags);

            // Fetch tickets after fetching tags
            await fetchTickets(jsonString);
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(async () => {
        await fetchTags();

    }, []);

    const [file, setFile] = useState({
        lanes: []
    });

    const fetchTickets = async (jsonString) => {
        try {

            const {data} = await api.get("/ticket/kanban", {
                params: {
                    queueIds: JSON.stringify(jsonString), teste: true
                }
            });
            setTickets(data.tickets);
        } catch (err) {
            console.log(err);
            setTickets([]);
        }
    };


    const popularCards = (jsonString) => {
        const filteredTickets = tickets.filter(ticket => ticket.tags.length === 0 && ticketMatchesSearchQuery(ticket));

        const lanes = [{
            id: 0, title: i18n.t("Em aberto") + " " + filteredTickets.length.toString(), cards: filteredTickets
                .map(ticket => ({
                    id: ticket.id.toString(), label: "Ticket nº " + ticket.id.toString(), description: (<div>
                            <p>
                                {ticket.contact.number}
                                <br/>
                                {ticket.lastMessage}
                            </p>
                 <IconButton edge="start" onClick={() => { handleCardClick(ticket.uuid) }}>
                  <WhatsAppIcon style={{ color: "#10a110" }} />
                </IconButton>

                        </div>), title: ticket.contact.name, draggable: true, href: "/tickets/" + ticket.uuid,
                })),
        }, ...tags.map(tag => {
            const filteredTickets = tickets.filter(ticket => {
                const tagIds = ticket.tags.map(tag => tag.id);
                return tagIds.includes(tag.id) && ticketMatchesSearchQuery(ticket);
            });

            return {
                id: tag.id.toString(),
                title: tag.name + " " + filteredTickets.length.toString(), 
               // label: tag.id.toString(),
                cards: filteredTickets.map(ticket => ({
                    id: ticket.id.toString(), label: "Ticket nº " + ticket.id.toString(), description: (<div>
                            <p>
                                {ticket.contact.number}
                                <br/>
                                {ticket.lastMessage}
                            </p>
                            <IconButton edge="start" onClick={() => { handleCardClick(ticket.uuid) }}>
                  <WhatsAppIcon style={{ color: "#10a110" }} />
                </IconButton>

                        </div>), title: ticket.contact.name, draggable: true, href: "/tickets/" + ticket.uuid,
                })),
                style: {backgroundColor: tag.color, color: "white"}
            };
        }),];

        setFile({lanes});
    };

    const handleCardClick = (uuid) => {
        //console.log("Clicked on card with UUID:", uuid);
        history.push('/tickets/' + uuid);
    };

    useEffect(() => {
        popularCards(jsonString);
    }, [tags, tickets, searchQuery]);


    const handleCardMove = async (cardId, sourceLaneId, targetLaneId) => {
        try {
            if (sourceLaneId === targetLaneId) {
                return;
            }
            const movedTicket = tickets.find(
                (ticket) => ticket.id.toString() === targetLaneId
            );

            console.log(
                `Lane de entrada ${sourceLaneId}, Lane de saída ${targetLaneId}`
            );

            if (sourceLaneId === targetLaneId) {
                console.log(`Mesma lane de entrada e saída: ${sourceLaneId}`);
            }

            const response = await api.get("/schedules", {
                params: { contactId: movedTicket.contact.id },
            });

            const schedules = response.data.schedules;

            if (schedules.length === 0) {
                try {
                    const tagResponse = await api.get(`/tags/${sourceLaneId}`);
                    if (tagResponse.data.actCamp === 1){
                        await   handleEmptySchedules(sourceLaneId, movedTicket);
                    }

                }catch (error) {
                    console.error("Erro ao buscar tag:", error);
                    await handleEmptySchedules(sourceLaneId, movedTicket);
                }

            } else {
                try {
                    const tagResponse = await api.get(`/tags/${sourceLaneId}`);
                    if (tagResponse.data.actCamp === 1){
                        await  handleNonEmptySchedules(sourceLaneId, schedules, movedTicket);
                    }

                }catch (error) {
                    console.error("Erro ao buscar tag:", error);
                    await handleNonEmptySchedules(sourceLaneId, schedules, movedTicket);
                }

            }

            await api.delete(`/ticket-tags/${targetLaneId}`);
            await api.put(`/ticket-tags/${targetLaneId}/${sourceLaneId}`);

            // Busque os tickets atualizados apenas quando necessário
        } catch (err) {
            console.log(err);
        }
        await fetchTickets(jsonString);
        popularCards(jsonString);
    };

    const handleEmptySchedules = async (sourceLaneId, movedTicket) => {
        if (String(sourceLaneId) !== 0) {
            toast.success(
                `Campanha nº ${sourceLaneId} iniciada para ${movedTicket.contact.name}. Horario de envio as 18h`,
                {
                    autoClose: 10000,
                }
            );
            await campanhaInit(movedTicket, sourceLaneId);
        } else {
            toast.success(`Campanhas zeradas para ${movedTicket.contact.name}.`, {
                autoClose: 10000,
            });
        }
    };

    const handleNonEmptySchedules = async (sourceLaneId, schedules, movedTicket) => {
        const campIdInSchedules = schedules[0].campId;

        if (String(sourceLaneId) === String(campIdInSchedules)) {
            toast.success(
                `Campanha nº ${sourceLaneId} já está em andamento para ${movedTicket.contact.name}.`,
                {
                    autoClose: 10000,
                }
            );
        } else {
            const scheduleIdToDelete = schedules[0].id;

            if (String(sourceLaneId) !== 0) {
                await handleDeleteScheduleAndInit(
                    sourceLaneId,
                    scheduleIdToDelete,
                    campIdInSchedules,
                    movedTicket
                );
            } else {
                await handleDeleteSchedule(sourceLaneId, scheduleIdToDelete, movedTicket);
            }
        }
    };

    const handleDeleteScheduleAndInit = async (
        sourceLaneId,
        scheduleIdToDelete,
        campIdInSchedules,
        movedTicket
    ) => {
        try {
            await api.delete(`/schedules/${scheduleIdToDelete}`);
            toast.error(
                `Campanha nº ${campIdInSchedules} excluída para ${movedTicket.contact.name}.`,
                {
                    autoClose: 10000,
                }
            );
            await campanhaInit(movedTicket, sourceLaneId);
            toast.success(
                `Campanha nº ${sourceLaneId} iniciada para ${movedTicket.contact.name}. Horario de envio as 18h`,
                {
                    autoClose: 10000,
                }
            );
        } catch (deleteError) {
            console.error("Erro ao excluir campanha:", deleteError);
            // Lógica adicional em caso de erro ao excluir
        }
    };

    const handleDeleteSchedule = async (
        sourceLaneId,
        scheduleIdToDelete,
        movedTicket
    ) => {
        try {
            await api.delete(`/schedules/${scheduleIdToDelete}`);
            toast.success(`Campanhas zeradas para ${movedTicket.contact.name}.`, {
                autoClose: 10000,
            });
        } catch (deleteError) {
            console.error("Erro ao excluir campanha:", deleteError);
            // Lógica adicional em caso de erro ao excluir
        }
    };

    const campanhaInit = async (ticket, campId) => {
        try {
            const tagResponse = await api.get(`/tags/${campId}`);
            const tagMsg = tagResponse.data.msgR;
            const rptDays = tagResponse.data.rptDays;
            const pathFile = tagResponse.data.mediaPath;
            const nameMedia = tagResponse.data.mediaName;
            console.log(tagMsg);

            const getRandomNumber = (min, max) => {
                return Math.floor(Math.random() * (max - min + 1)) + min;
            };
            // Função para obter a data de hoje às 18:00
            const getToday18h = () => {
                const today18h = new Date();
                today18h.setHours(18, 0, 0, 0);
                return today18h;
            };

            // Função para obter a data de amanhã às 18:00
            const getNextDay18h = () => {
                const nextDay18h = new Date();
                nextDay18h.setDate(nextDay18h.getDate() + 1);
                nextDay18h.setHours(18, 0, 0, 0);
                return nextDay18h;
            };

            // Obter a data de hoje às 18:00 e a data de amanhã às 18:00
            const today18h = getToday18h();
            const nextDay18h = getNextDay18h();

            // Gerar segundos aleatórios entre 1 e 60
            const randomSeconds = getRandomNumber(1, 60);

            // Gerar minutos aleatórios entre 1 e 30
            const randomMinutes = getRandomNumber(1, 30);

            // Construir a data com a hora fixa de 18:00 e os segundos e minutos aleatórios
            const currentDate = new Date();
            currentDate.setSeconds(randomSeconds);
            currentDate.setMinutes(randomMinutes);
            currentDate.setHours(18, 0, 0, 0);


            const getToday18hRandom = () => {
                const today18h = new Date();
                today18h.setHours(18);
                today18h.setMinutes(getRandomNumber(1, 30)); // Adiciona minutos aleatórios
                today18h.setSeconds(getRandomNumber(1, 60)); // Adiciona segundos aleatórios
                return today18h;
            };

            // Obter a data de hoje às 18:00 com minutos e segundos aleatórios
            const campDay = getToday18hRandom();

            const currentTime = new Date();
            if (currentTime.getHours() >= 18) {
                // Se já passou das 18:00, definir o horário para amanhã
                campDay.setDate(campDay.getDate() + 1);
            }

            const scheduleData = {
                body: tagMsg,
                sendAt: campDay,
                contactId: ticket.contact.id,
                userId: user.id,
                daysR: rptDays,
                campId: campId,
                mediaPath: pathFile,
                mediaName: nameMedia
            };

            try {
                const response = await api.post("/schedules", scheduleData);

                if (response.status === 200) {
                    console.log("Agendamento criado com sucesso:", response.data);
                } else {
                    console.error("Erro ao criar agendamento:", response.data);
                }
            } catch (error) {
                console.error("Erro ao criar agendamento:", error);
            }
        } catch (error) {
            console.error("Erro ao criar agendamento:", error);
        }
    };

    const ticketMatchesSearchQuery = (ticket) => {

        if (searchQuery.trim() === "") {
            return true;
        }

        const query = searchQuery.toLowerCase();
        return (ticket.contact.number.toLowerCase().includes(query) || ticket.lastMessage.toLowerCase().includes(query) || ticket.contact.name.toLowerCase().includes(query));
    };

    const handleSearchQueryChange = (e) => {
        setSearchQuery(e.target.value);
    };


    return (<div className={'flex flex-column'}>
            <div className={'flex items-center justify-center'}>
                <Paper className={'align-center w-1/3 p-1 flex m-2'}>
                    <div className={'self-center'}>
                        <SearchIcon/>
                    </div>
                    <InputBase
                        placeholder="Pesquisar..."
                        classes={{
                            root: classes.inputRoot, input: classes.inputInput,
                        }}
                        inputProps={{"aria-label": "search"}}
                        value={searchQuery}
                        onChange={handleSearchQueryChange}
                    />
                </Paper>
                {/* IconButton com o ícone de engrenagem */}
                <IconButton
                    color="primary"
                    className={classes.button}
                    onClick={handleOpenBoardSettings}
                >
                    <SettingsIcon/>
                </IconButton>
                <InstructionsModal/>

                {/* Modal de configurações do quadro */}
                {settingsModalOpen && (<BoardSettingsModal
                        open={settingsModalOpen}
                        onClose={() => setSettingsModalOpen(false)}
                    />)}
            </div>

            <Board
                data={file}
                onCardMoveAcrossLanes={handleCardMove}
                style={{
                    backgroundColor: "rgba(252, 252, 252, 0.03)", width: "100%", height: "700px",
                }}
            />
        </div>);
};


export default Kanban;
