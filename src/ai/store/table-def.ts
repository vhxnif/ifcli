import { db, tables } from '../sqlite-client'

const chat = `
    CREATE TABLE chat (
        id TEXT,
        name TEXT,
        "select" INTEGER,
        action_time INTEGER,
        select_time INTEGER,
        CONSTRAINT chat_PK PRIMARY KEY (id)
    );
    CREATE UNIQUE INDEX chat_name_IDX ON chat (name);
`

const chat_message = `
    CREATE TABLE chat_message (
        id TEXT,
        chat_id TEXT,
        "role" TEXT,
        content TEXT,
        action_time INTEGER,
        CONSTRAINT chat_message_PK PRIMARY KEY (id)
    );
`

const chat_config = `
    CREATE TABLE chat_config (
        id TEXT,
        chat_id TEXT,
        sys_prompt TEXT,
        with_context INTEGER,
        context_limit INTEGER DEFAULT (30),
        model TEXT,
        update_time INTEGER,
        CONSTRAINT chat_config_PK PRIMARY KEY (id)
    );
`

// table_name: ddl
const table_def = {
    "chat": chat,
    "chat_message": chat_message,
    "chat_config": chat_config,
}

const initTable = () => {
    const tableNames = tables().map(it => it.name)
    Object.entries(table_def).filter(([k, _]) => !tableNames.includes(k)).forEach(([_,v]) => {
        db.run(v)
    })
}

export { initTable }
