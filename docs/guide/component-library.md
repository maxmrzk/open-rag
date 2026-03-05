# Component Library

The component library is a curated collection of reusable Python snippets. Each component maps to a node type and can be dragged directly onto the System Designer canvas.

## Built-in categories

| Category | Examples |
|----------|---------|
| **Loaders** | `PDFLoader`, `WebBaseLoader`, `S3Loader` |
| **Splitters** | `RecursiveCharacterTextSplitter`, `SemanticChunker` |
| **Embedders** | `OpenAIEmbeddings`, `HuggingFaceEmbeddings`, `OllamaEmbeddings` |
| **Vector Stores** | `QdrantVectorStore`, `ChromaVectorStore`, `InMemoryVectorStore` |
| **Retrievers** | `SimilarityRetriever`, `MMRRetriever`, `HybridRetriever` |
| **LLMs** | `OpenAI`, `Anthropic Claude`, `Ollama`, `Google Gemini` |
| **Graph Stores** | `Neo4jGraphStore`, `NetworkXGraphStore` |

## Using a component

1. Open the **Component Library** sidebar in the System Designer.
2. Search or browse by category.
3. Drag a component onto the canvas — it creates a pre-configured node.
4. Edit the component's properties in the right-hand panel.

## Custom components

Create a new component by clicking **+ New Component** in the library sidebar. Components are stored per-project and can be shared across systems.
