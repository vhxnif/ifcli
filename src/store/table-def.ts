const chat = `
    CREATE TABLE IF NOT EXISTS chat (
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
    CREATE TABLE IF NOT EXISTS chat_message (
        id TEXT,
        chat_id TEXT,
        "role" TEXT,
        content TEXT,
        pair_key TEXT,
        action_time INTEGER,
        CONSTRAINT chat_message_PK PRIMARY KEY (id)
    );
`

const chat_config = `
    CREATE TABLE IF NOT EXISTS chat_config (
        id TEXT,
        chat_id TEXT,
        sys_prompt TEXT,
        with_context INTEGER,
        context_limit INTEGER DEFAULT (30),
        llm_type TEXT,
        model TEXT,
        scenario_name TEXT,
        scenario REAL,
        update_time INTEGER,
        CONSTRAINT chat_config_PK PRIMARY KEY (id)
    );
`

const chat_prompt = `
     CREATE TABLE IF NOT EXISTS chat_prompt (
        name TEXT,
        version TEXT,
        role TEXT DEFAULT 'system',
        content TEXT,
        modify_time INTEGER,
        CONSTRAINT chat_prompt_PK PRIMARY KEY (name, version)
    );
`

// table_name: ddl
const table_def = {
    "chat": chat,
    "chat_message": chat_message,
    "chat_config": chat_config,
    "chat_prompt": chat_prompt,
}

export { table_def }
