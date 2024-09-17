import * as path from 'path';
import * as fs from 'fs';
import { Injectable } from '@nestjs/common';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import type { Document } from '@langchain/core/documents';
import {
  RunnablePassthrough,
  RunnableSequence,
} from '@langchain/core/runnables';
import { env } from 'src/config';

console.log(env.OPENAI_API_KEY);

const formatDocumentsAsString = (documents: Document[]) => {
  return documents.map((document) => document.pageContent).join('\n\n');
};

@Injectable()
export class AppService {
  async learning(file: any) {
    const filepath = path.join(__dirname, `../static/vector-store.pdf`);
    fs.writeFile(filepath, file.buffer, () => null);
    const loader = new PDFLoader(filepath, {
      parsedItemSeparator: '',
      splitPages: false,
    });
    const docs = await loader.load();
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 200,
      chunkOverlap: 50,
    });
    const documents = await splitter.splitDocuments(docs);
    const embeddings = new OpenAIEmbeddings();
    const vectorstore = await FaissStore.fromDocuments(documents, embeddings);
    await vectorstore.save('./vector-store-pdf');
    return 'Read PDF successfully';
  }
  async asking(query) {
    console.log(query.q);

    const model = new ChatOpenAI({
      model: 'gpt-4o',
    });
    const embeddings = new OpenAIEmbeddings();
    const vectorPath = path.join(__dirname, '../vector-store-pdf');
    const vectorStore = await FaissStore.load(vectorPath, embeddings);
    const vectorStoreRetriever = vectorStore.asRetriever();

    const SYSTEM_TEMPLATE = `You are a Chartered Financial Analyst. Use the following pieces of context to answer the question at the end.
    If you don't know the answer, just say that you don't know, don't try to make up an answer.
    ----------------
    {context}`;

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', SYSTEM_TEMPLATE],
      ['human', '{question}'],
    ]);

    const chain = RunnableSequence.from([
      {
        context: vectorStoreRetriever.pipe(formatDocumentsAsString),
        question: new RunnablePassthrough(),
      },
      prompt,
      model,
      new StringOutputParser(),
    ]);

    const answer = await chain.invoke(query.q);
    return answer;
  }
}
