export class File {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly parentId: string | null,
    public readonly createdAt: Date,
  ) {}
}
