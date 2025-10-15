import {
    table,
    type Alignment,
    type ColumnUserConfig,
    type TableUserConfig,
} from 'table'
import { terminal } from './platform-utils'

const tableDefaultConfig: TableUserConfig = {
    border: {
        topBody: `─`,
        topJoin: `┬`,
        topLeft: `╭`,
        topRight: `╮`,

        bottomBody: `─`,
        bottomJoin: `┴`,
        bottomLeft: `╰`,
        bottomRight: `╯`,

        bodyLeft: `│`,
        bodyRight: `│`,
        bodyJoin: `│`,

        joinBody: `─`,
        joinLeft: `├`,
        joinRight: `┤`,
        joinJoin: `┼`,
    },
}

type TableConfigParam = {
    cols: number[]
    celConfig?: ColumnUserConfig[]
    maxColumn?: number
    alignment?: Alignment
}

const tableConfig = (param: TableConfigParam): TableUserConfig => {
    return tableConfigWithExt(param)[1]
}

type TableExt = {
    colNum: number
}

const tableConfigWithExt = ({
    cols,
    celConfig = [],
    maxColumn = 70,
    alignment = 'center',
}: {
    cols: number[]
    celConfig?: ColumnUserConfig[]
    maxColumn?: number
    alignment?: Alignment
}): [TableExt, TableUserConfig] => {
    const allPart = cols.reduce((sum, it) => (sum += it), 0)
    const curCol = terminal.column - 4 * cols.length
    const colNum = curCol > maxColumn ? maxColumn : curCol
    const calWidth = cols.map((it) => Math.floor(colNum * (it / allPart)))
    return [
        { colNum },
        {
            ...tableDefaultConfig,
            columns: calWidth.map((it, idx) => {
                if (celConfig.length === 0) {
                    return {
                        alignment,
                        width: it,
                    }
                }
                return { ...celConfig[idx], width: it }
            }),
        },
    ]
}

const printTable = (data: unknown[][], userConfig?: TableUserConfig): void => {
    console.log(table(data, userConfig))
}

export {
    type TableExt,
    type TableConfigParam,
    tableConfigWithExt,
    tableConfig,
    printTable,
}
