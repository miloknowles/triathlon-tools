"use client";

import { Button, SearchSelect, Badge, SearchSelectItem, TextInput } from "@tremor/react";

import {
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from '@tremor/react';
import { ArrowLeftIcon, ArrowRightIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { Link } from "@radix-ui/themes";


interface RaceData {
  id: string
  name: string
  series: string
  subevents: { id: string, label: string }[]
}


export default function RaceTable({ data }: { data: RaceData[] }) {
  const [series, setSeries] = useState<
    "all" | "IRONMAN" | "IRONMAN-70.3" | "5150-Triathlon-Series" | undefined
  >("IRONMAN-70.3");
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState<string | undefined>(undefined);

  const perPage = 15;

  let filtered = data.filter((r: any) => {
    if (series === undefined || series === "all") return true;
    return r.series === series;
  });

  if (query) {
    filtered = filtered.filter((r: any) => {
      return r.name.toLowerCase().includes(query.toLowerCase());
    });
  }

  const maxPage = Math.ceil(filtered.length / perPage);

  const rows = filtered.slice(page*perPage, page*perPage + perPage).map((row) => {
    return (
      <TableRow key={row.id}>
        <TableCell>
          <Link href={`/results/${row.id}`}>{row.name}</Link>
        </TableCell>
        <TableCell>
          {{
            "IRONMAN": "IRONMAN",
            "IRONMAN-70.3": "70.3",
            "5150-Triathlon-Series": "5150",
          }[row.series]}
        </TableCell>
        <TableCell>
          <Badge>{row.subevents.length}</Badge>
        </TableCell>
      </TableRow>
    );
  });

  const nextPage = () => {
    setPage(Math.min(page + 1, maxPage));
  }

  const prevPage = () => {
    setPage(Math.max(page - 1, 0));
  }

  return (
    <div className="py-6">
      <div className="flex gap-3 flex-col-reverse sm:flex-row">
        <TextInput
          icon={MagnifyingGlassIcon}
          placeholder="Search..."
          value={query}
          onValueChange={setQuery}
        />
        <SearchSelect
          className="sm:max-w-[240px]"
          placeholder="Filter by distance"
          value={series}
          // @ts-ignore
          onValueChange={setSeries}
          
        >
          <SearchSelectItem value="all">All</SearchSelectItem>
          <SearchSelectItem value="IRONMAN">IRONMAN</SearchSelectItem>
          <SearchSelectItem value="IRONMAN-70.3">70.3</SearchSelectItem>
          <SearchSelectItem value="5150-Triathlon-Series">5150</SearchSelectItem>
        </SearchSelect>
      </div>
      <Table className="mt-3">
        <TableHead>
          <TableRow>
            <TableHeaderCell className="max-w-[200px]">Name</TableHeaderCell>
            <TableHeaderCell>Distance</TableHeaderCell>
            <TableHeaderCell>Result Years</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows}
        </TableBody>
      </Table>
      <div className="flex justify-end mt-3 gap-3">
        <Button variant="secondary" icon={ArrowLeftIcon} onClick={prevPage} disabled={page === 0}>Previous</Button>
        <Button icon={ArrowRightIcon} iconPosition="right" onClick={nextPage} disabled={page >= (maxPage - 1)}>Next</Button>
      </div>
    </div>
  );
}
