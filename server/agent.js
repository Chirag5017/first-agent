import dotenv from "dotenv";
import Groq from "groq-sdk";
import readline from "readline/promises"

dotenv.config();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const expenseDB = [];
const incomeDB = [];
const messages = [
    {
        role : "system",
        content:`
       You are Josh, a smart and friendly personal finance assistant. Your job is to help users track expenses, manage income, and understand their financial balance. You respond naturally and conversationally—never show function calls or tool parameters to the user.

        You are connected to a finance database and have access to the following tools:

        1. getTotalExpense({ from, to }): string  
        → Returns the total expense in the specified date range.

        2. addExpense({ name, amount }): string  
        → Adds a new expense entry with the given name and amount.

        3. addIncome({ name, amount }): string  
        → Adds a new income entry with the given name and amount.

        4. getMoneyBalance(): string  
        → Returns the current total balance (income - expense).

        Guidelines:
        - Respond using clear, natural language.
        - Never expose or mention function names, parameters, or internal logic.
        - When adding income or expense, confirm the action in a friendly tone.
        - When reporting totals or balance, provide the amount with currency formatting (e.g., ₹700).
        - Offer follow-up help or questions when appropriate.
        - Be polite, concise, and helpful at all times.

        Current date and time: ${new Date().toUTCString()}

        Note: Always give me answer in rupees.
        `
    }
];
const tools = [
    {
        type: "function",
        function: {
            name : "getTotalExpense",
            description: "Get total expense from date to date.",
            parameters:{
                type:'object',
                properties: {
                    from : {
                        type: "string",
                        description : "From date to get the expense. ", 
                    },
                    to : {
                        type : "string",
                        description : "To date to get the expense",
                    }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name : "addExpense",
            description: "Add new expense entry to the expense database.",
            parameters:{
                type:'object',
                properties: {
                    name : {
                        type: "string",
                        description : "Name of the expense. e.g., Bought an iphone ", 
                    },
                    amount : {
                        type : "string",
                        description : "Amount of the expense.",
                    }
                }
            }
        }
    },
     {
        type: 'function',
        function: {
            name: 'addIncome',
            description: 'Add new income entry to income database',
            parameters: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'Name of the income. e.g., Got salary',
                    },
                    amount: {
                        type: 'string',
                        description: 'Amount of the income.',
                    },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'getMoneyBalance',
            description: 'Get remaining money balance from database.',
        },
    },

];

const callingAgent = async () => {
    const rl = readline.createInterface({input: process.stdin, output: process.stdout});
while(true) {
    const question = await rl.question("User: ");

    if(question === 'bye') break;

    messages.push({
        role:"user",
        content:question,
    })

    while(true) {
        const completion = await groq.chat.completions.create({
            messages:messages,
            model:"llama-3.3-70b-versatile",
            tools:tools,
        });

        messages.push(completion.choices[0].message);

        const toolCalls = completion.choices[0].message.tool_calls;

        if(!toolCalls) {
            console.log(`Assistant: ${completion.choices[0].message.content}`);
            break;
        }

        for(const tool of toolCalls) {
            const functionName = tool.function.name;
            const functionArgs = tool.function.arguments;

            let result = '';
            if (functionName === 'getTotalExpense') {
                result = getTotalExpense(JSON.parse(functionArgs));
            } else if (functionName === 'addExpense') {
                result = addExpense(JSON.parse(functionArgs));
            } else if (functionName === 'addIncome') {
                result = addIncome(JSON.parse(functionArgs));
            } else if (functionName === 'getMoneyBalance') {
                result = getMoneyBalance(JSON.parse(functionArgs));
            }
            
            messages.push({
                role: 'tool',
                content: result,
                tool_call_id: tool.id,
            });
        }
    }
}
 rl.close();
}

callingAgent();

const getTotalExpense = ({from, to}) => {
    const expense = expenseDB.reduce((acc,item) => acc + item.amount,0);
    return `${expense}`;
}

const addExpense = ({name, amount}) => {
    expenseDB.push({name,amount});
    return "Added to the income database. ";
}

const addIncome = ({ name, amount }) => {
    incomeDB.push({ name, amount });
    return 'Added to the income database.';
}

const getMoneyBalance = () => {
    const totalIncome = incomeDB.reduce((acc,item) => acc + item.amount, 0);
     const totalExpense = expenseDB.reduce((acc, item) => acc + item.amount, 0);

    return `${totalIncome - totalExpense} INR`;
}