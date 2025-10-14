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
const chat_topic = `
    CREATE TABLE IF NOT EXISTS chat_topic (
        id TEXT,
        chat_id TEXT,
        content TEXT,
        "select" INTEGER,
        create_time INTEGER,
        select_time INTEGER,
        CONSTRAINT chat_topic_PK PRIMARY KEY (id)
    );
    CREATE INDEX IF NOT EXISTS chat_topic_IDX ON chat_topic (chat_id);
`

const chat_message = `
    CREATE TABLE IF NOT EXISTS chat_message (
        id TEXT,
        topic_id TEXT,
        "role" TEXT,
        content TEXT,
        pair_key TEXT,
        action_time INTEGER,
        CONSTRAINT chat_message_PK PRIMARY KEY (id)
    );
    CREATE INDEX IF NOT EXISTS chat_message_IDX ON chat_message (topic_id);
    CREATE INDEX IF NOT EXISTS chat_message_2_IDX ON chat_message (pair_key);
`

const chat_config = `
    CREATE TABLE IF NOT EXISTS chat_config (
        id TEXT,
        chat_id TEXT,
        sys_prompt TEXT,
        with_context INTEGER,
        with_mcp INTEGER,
        context_limit INTEGER DEFAULT (30),
        llm_type TEXT,
        model TEXT,
        scenario_name TEXT,
        scenario REAL,
        update_time INTEGER,
        CONSTRAINT chat_config_PK PRIMARY KEY (id)
    );
    CREATE INDEX IF NOT EXISTS chat_config_IDX ON chat_config (chat_id);
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
const chat_preset_message = `
    CREATE TABLE IF NOT EXISTS chat_preset_message (
        id TEXT,
        chat_id TEXT,
        user TEXT,
        assistant TEXT,
        create_time INTEGER,
        CONSTRAINT chat_preset_message_PK PRIMARY KEY (id)
    );
    CREATE INDEX IF NOT EXISTS chat_preset_message_IDX ON chat_preset_message (chat_id);
`
const cmd_history = `
    CREATE TABLE IF NOT EXISTS cmd_history (
        id TEXT,
        type TEXT,
        key TEXT,
        last_switch_time INTEGER,
        frequency INTEGER,
        CONSTRAINT cmd_history_PK PRIMARY KEY (id)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS cmd_his_uk_IDX ON cmd_history (type, key);
`

const chat_config_ext = `
    CREATE TABLE IF NOT EXISTS "chat_config_ext" (
      "id" text NOT NULL,
      "chat_id" text NOT NULL,
      "ext" text NOT NULL,
      "create_time" integer NOT NULL,
      "update_time" integer NOT NULL,
      PRIMARY KEY ("id")
    );

    CREATE INDEX IF NOT EXISTS "idx_chat_id_chat_config_ext" ON "chat_config_ext"("chat_id");    
`
const cache = `
    CREATE TABLE "cache" (
      "key" text NOT NULL,
      "value" text NOT NULL,
      PRIMARY KEY ("key")
    );
`

// table_name: ddl
const table_def: Record<string, string> = {
    chat: chat,
    chat_topic: chat_topic,
    chat_message: chat_message,
    chat_config: chat_config,
    chat_prompt: chat_prompt,
    chat_preset_message: chat_preset_message,
    cmd_history: cmd_history,
    chat_config_ext: chat_config_ext,
    cache: cache,
}

export { table_def }
