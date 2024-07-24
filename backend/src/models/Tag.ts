import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  BelongsToMany,
  ForeignKey,
  BelongsTo,
  HasMany,
  DataType
} from "sequelize-typescript";
import Company from "./Company";
import Ticket from "./Ticket";
import TicketTag from "./TicketTag";

@Table
class Tag extends Model<Tag> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @Column
  color: string;

  @HasMany(() => TicketTag)
  ticketTags: TicketTag[];

  @BelongsToMany(() => Ticket, () => TicketTag)
  tickets: Ticket[];

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @Column
  kanban: number;

  @Column(DataType.TEXT)
  msgR: string;

  @Column(DataType.TIME)
  recurrentTime: string | null;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  actCamp: number | null;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  rptDays: number | null;


  @Column
  mediaPath: string;

}

export default Tag;
