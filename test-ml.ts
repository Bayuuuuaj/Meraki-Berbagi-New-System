
import { MLEngine } from "./server/services/ai/ml-engine";

console.log("Testing ML Engine...");

try {
    const text = "Ini adalah contoh kalimat untuk testing tokenisasi";
    const tokens = MLEngine.tokenize(text);
    console.log("Tokens:", tokens);

    const docs = [
        { id: "1", content: "dokumen pertama tentang ai" },
        { id: "2", content: "dokumen kedua tentang machine learning" }
    ];

    const model = MLEngine.buildTFIDFModel(docs);
    console.log("TF-IDF Model built successfully");
    console.log("Vocabulary size:", model.vocabulary.size);

} catch (error) {
    console.error("Error testing ML Engine:", error);
}
