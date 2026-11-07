export class Folder {
    constructor(
        public readonly id: string,
        public readonly name: string,
        // NULL is we are in root
        public readonly parentId: string | null,
        public readonly createdAt: Date,
    ) {}
}
