import React, {useState, useEffect} from 'react';
import {makeStyles} from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import IconButton from '@material-ui/core/IconButton';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import Collapse from '@material-ui/core/Collapse';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Divider from '@material-ui/core/Divider';
import api from '../../services/api';
import TextareaAutosize from '@material-ui/core/TextareaAutosize';
import Paper from "@material-ui/core/Paper";
import {EditorState, convertToRaw} from 'draft-js';
import {Editor} from 'react-draft-wysiwyg';
import draftToHtml from 'draftjs-to-html';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import htmlToDraft from 'html-to-draftjs';
import ContentState from "draft-js/lib/ContentState";


const useStyles = makeStyles((theme) => ({
    root: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        margin: '1rem',
        [theme.breakpoints.down("md")]: {
            margin: '0.5rem'
        },
    },
    inputContainer: {
        display: 'flex',
        width: '100%',
        marginBottom: '1rem',
    },
    input: {
        flex: '1 0 40%',
        marginRight: '1rem',
    },
    descriptionInput: {
        flex: '1 0 40%', // Ajuste a largura máxima conforme necessário
    },
    button: {
        flex: '1 0 20%',
    },
    listContainer: {
        width: '100%',
        marginTop: '1rem',
    },
    list: {
        marginBottom: '5px',
        backgroundColor: '#dfdfdf',
        color: 'black',
        cursor: 'pointer',
        '&.completedTask': {
            backgroundColor: '#c5f7c5', // Cor de fundo para tarefas concluídas
        },
    },
    description: {
        borderRadius: '4px',
        whiteSpace: 'pre-wrap',
        maxHeight: '100px',
        overflowY: 'auto',
    },
    separator: {
        width: '100%',
        borderBottom: '1px solid gray',
    },
    error: {
        color: 'red',
    },
    card: {
        margin: '8px 0',
    },
}));

const ToDoList = () => {
    const classes = useStyles();

    const [task, setTask] = useState('');
    const [description, setDescription] = useState('');
    const [editorState, setEditorState] = useState(EditorState.createEmpty());
    const [tasks, setTasks] = useState([]);
    const [editIndex, setEditIndex] = useState(-1);
    const [error, setError] = useState(null);
    const [expandedTask, setExpandedTask] = useState(null);


    let onEditorStateChange = (state) => {
        setEditorState(state);
        setDescription(draftToHtml(convertToRaw(editorState.getCurrentContent())));
    };
    const fetchTasks = async () => {
        try {
            const response = await api.get('/tasks');
            setTasks(response.data);
            setError(null);
        } catch (error) {
            if (error.message === 'Network Error') {
                setError('Erro de rede ao buscar tarefas. Verifique sua conexão à internet.');
            } else {
                console.error('Erro ao buscar as tarefas:', error);
                setError('Erro ao buscar as tarefas. Tente novamente mais tarde.');
            }
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleTaskChange = (event) => {
        setTask(event.target.value);
    };

    const handleDescriptionChange = (event) => {
        setDescription(event.target.value);
    };

    const handleAddTask = async () => {
        if (!task.trim()) {
            return;
        }

        const now = new Date();
        if (editIndex >= 0) {
            const updatedTask = {...tasks[editIndex], text: task, description: description};
            try {
                await api.put(`/tasks/${updatedTask.id}`, updatedTask);
                const updatedTasks = [...tasks];
                updatedTasks[editIndex] = updatedTask;
                setTasks(updatedTasks);
                setTask('');
                setDescription('');
                setEditIndex(-1);
            } catch (error) {
                console.error('Erro ao atualizar a tarefa:', error);
                setError('Erro ao atualizar a tarefa.');
            }
        } else {
            const newTask = {text: task, description, created_at: now, updated_at: now};
            try {
                const response = await api.post('/tasks', newTask);
                newTask.id = response.data.id;
                setTasks([...tasks, newTask]);
                setTask('');
                setDescription('');
            } catch (error) {
                console.error('Erro ao criar a tarefa:', error);
                setError('Erro ao criar a tarefa.');
            }
        }
    };

    const handleEditTask = (index) => {
        setTask(tasks[index].text);
        setDescription(tasks[index].description);
        setEditIndex(index);

        var inst = htmlToDraft(tasks[index].description);
        const contentState = ContentState.createFromBlockArray(inst.contentBlocks);

        setEditorState(EditorState.createWithContent(contentState));
    };

    const handleDeleteTask = async (index) => {
        const taskId = tasks[index].id;
        try {
            await api.delete(`/tasks/${taskId}`);
            const updatedTasks = [...tasks];
            updatedTasks.splice(index, 1);
            setTasks(updatedTasks);
            setError(null);
        } catch (error) {
            console.error('Erro ao excluir a tarefa:', error);
            setError('Erro ao excluir a tarefa.');
        }
    };

    return (
        <div className={classes.root}>
            <div className={classes.inputContainer}>
                <Paper className={'flex grow flex-col'}>

                    <div className={'flex grow p-3'}>
                        <TextField
                            className={classes.input + ' w-50'}
                            label="Nova tarefa"
                            value={task}
                            onChange={handleTaskChange}
                            variant="outlined"
                        />

                        <Button variant="contained" color="primary" onClick={handleAddTask}>
                            {editIndex >= 0 ? 'Salvar' : 'Adicionar'}
                        </Button>
                    </div>

                    <div className={'flex grow p-3'}>
                        <Editor wrapperClassName="border border-gray-300 w-full"
                                editorClassName="p-2 h-auto"
                                label="Descrição"
                                value={description}
                                editorState={editorState}
                                onEditorStateChange={onEditorStateChange}
                                variant="outlined"
                        />
                    </div>
                </Paper>

            </div>
            <div className={classes.listContainer}>
                <Paper className={'p-3'}>
                    {error && <div className={classes.error}>{error}</div>}
                    <List>
                        {tasks.map((task, index) => (
                            <React.Fragment key={task.id}>
                                <ListItem
                                    className={`${classes.list} ${task.completed ? classes.completedTask : ''}`}
                                    onClick={() => setExpandedTask(expandedTask === index ? null : index)}
                                >
                                    <ListItemText primary={task.text}/>
                                    <ListItemSecondaryAction>
                                        <IconButton onClick={() => handleEditTask(index)}>
                                            <EditIcon/>
                                        </IconButton>
                                        <IconButton onClick={() => handleDeleteTask(index)}>
                                            <DeleteIcon/>
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                                <Collapse in={expandedTask === index}>
                                    <Card className={classes.card}>
                                        <CardContent>
                                            <div className={classes.description}
                                                 dangerouslySetInnerHTML={{__html: task.description}}></div>
                                            <hr/>
                                            <small>
                                                Criado em: {new Date(task.created_at).toLocaleString()}<br/>
                                                Atualizado em: {new Date(task.updated_at).toLocaleString()}

                                            </small>
                                        </CardContent>
                                    </Card>
                                </Collapse>
                                {index < tasks.length - 1 && <Divider/>}
                            </React.Fragment>
                        ))}
                    </List>
                </Paper>
            </div>
        </div>
    );
};

export default ToDoList;