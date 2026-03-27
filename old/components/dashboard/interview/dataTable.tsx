import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ExternalLink, Scale, Info, FileText, Settings2 } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CustomMetric } from "@/types/interview";
import { CustomMetricScore } from "@/types/response";

// Custom metric score in table data (flattened for easier access)
export type CustomMetricScoreData = {
  [key: `metric_${string}`]: number | undefined;
};

export type TableData = {
  call_id: string;
  name: string;
  overallScore: number;
  communicationScore: number;
  weightedOverallScore?: number;
  callSummary: string;
  customMetrics?: CustomMetricScore[];
  cv_url?: string | null;
  isCVUpload?: boolean; // true for CV-only uploads (no interview)
  hasAttachedCV?: boolean; // true for interviews with attached CV
} & CustomMetricScoreData;

interface DataTableProps {
  data: TableData[];
  interviewId: string;
  customMetricDefinitions?: CustomMetric[];
}

function DataTable({ data, interviewId, customMetricDefinitions = [] }: DataTableProps) {
  // Determine if we should show weighted score based on custom metrics
  const hasCustomMetrics = customMetricDefinitions.length > 0;
  
  const [sorting, setSorting] = useState<SortingState>([
    { id: hasCustomMetrics ? "weightedOverallScore" : "overallScore", desc: true },
  ]);

  // Default column visibility: name, weighted score (if exists), overall score, summary visible
  const defaultVisibility: VisibilityState = useMemo(() => {
    const visibility: VisibilityState = {
      name: true,
      overallScore: true,
      communicationScore: false, // Hidden by default
      callSummary: true,
    };
    
    // If custom metrics exist, show weighted score and hide individual metrics by default
    if (hasCustomMetrics) {
      visibility.weightedOverallScore = true;
      customMetricDefinitions.forEach((metric) => {
        visibility[`metric_${metric.id}`] = false;
      });
    }
    
    return visibility;
  }, [hasCustomMetrics, customMetricDefinitions]);

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(defaultVisibility);

  const customSortingFn = (a: any, b: any) => {
    if (a === null || a === undefined) {
      return -1;
    }
    if (b === null || b === undefined) {
      return 1;
    }

    return a - b;
  };

  // Build columns dynamically based on custom metrics
  const columns = useMemo(() => {
    const baseColumns: ColumnDef<TableData>[] = [
      {
        accessorKey: "name",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              className={`w-full justify-start font-semibold text-[15px] mb-1 ${column.getIsSorted() ? "text-indigo-600" : "text-black"}`}
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Name
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="flex items-center justify-left min-h-[2.6em]">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-pointer mr-2 flex-shrink-0">
                    <ExternalLink
                      size={16}
                      className="text-current hover:text-indigo-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(
                          `/interviews/${interviewId}?call=${row.original.call_id}`,
                          "_blank",
                        );
                      }}
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-gray-500 text-white font-normal"
                >
                  View Response
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="truncate">{row.getValue("name")}</span>
            {/* CV Badge for interviews with attached CV */}
            {row.original.hasAttachedCV && !row.original.isCVUpload && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="ml-2 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-semibold rounded flex items-center gap-1">
                      <FileText size={10} />
                      CV
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="bg-gray-700 text-white font-normal"
                  >
                    This candidate attached a CV
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {/* CV Upload badge for CV-only entries */}
            {row.original.isCVUpload && (
              <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-semibold rounded">
                CV Only
              </span>
            )}
          </div>
        ),
        sortingFn: (rowA, rowB, columnId) => {
          const a = rowA.getValue(columnId) as string;
          const b = rowB.getValue(columnId) as string;

          return a.toLowerCase().localeCompare(b.toLowerCase());
        },
      },
    ];

    // Add weighted overall score if custom metrics exist
    if (hasCustomMetrics) {
      baseColumns.push({
        accessorKey: "weightedOverallScore",
        header: ({ column }) => {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start font-semibold text-[15px] mb-1 ${column.getIsSorted() ? "text-indigo-600" : "text-black"}`}
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                  >
                    <Scale className="mr-1 h-4 w-4 text-indigo-500" />
                    Weighted Score
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-700 text-white max-w-xs">
                  <p>Overall score calculated from custom metrics based on their weights.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
        cell: ({ row }) => {
          const score = row.getValue("weightedOverallScore") as number | undefined;
          return (
            <div className="min-h-[2.6em] flex items-center justify-center">
              <span className={score !== undefined ? "font-semibold text-indigo-600" : ""}>
                {score !== undefined ? Math.round(score) : "-"}
              </span>
            </div>
          );
        },
        sortingFn: (rowA, rowB, columnId) => {
          const a = rowA.getValue(columnId) as number | null;
          const b = rowB.getValue(columnId) as number | null;

          return customSortingFn(a, b);
        },
      });
    }

    // Add overall score column
    baseColumns.push({
      accessorKey: "overallScore",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            className={`w-full justify-start font-semibold text-[15px] mb-1 ${column.getIsSorted() ? "text-indigo-600" : "text-black"}`}
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Overall Score
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const score = row.getValue("overallScore") as number | undefined;
        return (
          <div className="min-h-[2.6em] flex items-center justify-center">
            {score !== undefined ? Math.round(score) : "-"}
          </div>
        );
      },
      sortingFn: (rowA, rowB, columnId) => {
        const a = rowA.getValue(columnId) as number | null;
        const b = rowB.getValue(columnId) as number | null;

        return customSortingFn(a, b);
      },
    });

    // Add communication score
    baseColumns.push({
      accessorKey: "communicationScore",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            className={`w-full justify-start font-semibold text-[15px] mb-1 ${column.getIsSorted() ? "text-indigo-600" : "text-black"}`}
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Communication
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const score = row.getValue("communicationScore") as number | undefined;
        return (
          <div className="min-h-[2.6em] flex items-center justify-center">
            {score !== undefined ? Math.round(score) : "-"}
          </div>
        );
      },
      sortingFn: (rowA, rowB, columnId) => {
        const a = rowA.getValue(columnId) as number | null;
        const b = rowB.getValue(columnId) as number | null;

        return customSortingFn(a, b);
      },
    });

    // Add custom metric columns dynamically
    customMetricDefinitions.forEach((metric) => {
      const accessorKey = `metric_${metric.id}`;
      baseColumns.push({
        accessorKey,
        header: ({ column }) => {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start font-semibold text-[13px] mb-1 ${column.getIsSorted() ? "text-indigo-600" : "text-black"}`}
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                  >
                    {metric.title.length > 15 ? `${metric.title.substring(0, 15)}...` : metric.title}
                    <span className="ml-1 text-xs text-gray-400">({metric.weight})</span>
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-700 text-white max-w-xs">
                  <p className="font-semibold">{metric.title}</p>
                  <p className="text-sm mt-1">{metric.description}</p>
                  <p className="text-xs mt-1 text-gray-300">Weight: {metric.weight}/10</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
        cell: ({ row }) => {
          const score = row.getValue(accessorKey) as number | undefined;
          return (
            <div className="min-h-[2.6em] flex items-center justify-center">
              {score !== undefined ? (
                <span className={`text-sm font-medium ${score >= 7 ? 'text-green-600' : score >= 4 ? 'text-yellow-600' : 'text-red-500'}`}>
                  {Math.round(score)}
                </span>
              ) : (
                <span className="text-gray-400 text-sm">-</span>
              )}
            </div>
          );
        },
        sortingFn: (rowA, rowB, columnId) => {
          const a = rowA.getValue(columnId) as number | null;
          const b = rowB.getValue(columnId) as number | null;

          return customSortingFn(a, b);
        },
      });
    });

    // Add summary column at the end
    baseColumns.push({
      accessorKey: "callSummary",
      header: () => (
        <div className="w-full justify-start font-semibold text-[15px] mb-1 text-black">
          Summary
        </div>
      ),
      cell: ({ row }) => {
        const summary = row.getValue("callSummary") as string;
        return (
          <div className="flex items-center justify-center">
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors">
                    <Info size={16} className="text-indigo-500" />
                    <span className="text-xs text-gray-500">View</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent 
                  side="left" 
                  className="bg-gray-800 text-white max-w-sm p-3 rounded-lg shadow-xl"
                  sideOffset={5}
                >
                  <p className="font-semibold text-sm mb-1 text-indigo-300">Candidate Summary</p>
                  <p className="text-sm leading-relaxed">{summary}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
    });

    return baseColumns;
  }, [customMetricDefinitions, hasCustomMetrics, interviewId]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Column display names for the dropdown
  const getColumnDisplayName = (columnId: string): string => {
    switch (columnId) {
      case "name": return "Name";
      case "weightedOverallScore": return "Weighted Score";
      case "overallScore": return "Overall Score";
      case "communicationScore": return "Communication";
      case "callSummary": return "Summary";
      default:
        // For custom metrics, find the title
        if (columnId.startsWith("metric_")) {
          const metricId = columnId.replace("metric_", "");
          const metric = customMetricDefinitions.find(m => m.id === metricId);
          return metric?.title || columnId;
        }
        return columnId;
    }
  };

  return (
    <div className="rounded-md border">
      {/* Column visibility controls */}
      <div className="flex items-center justify-between p-2 border-b bg-slate-50">
        <span className="text-sm text-gray-600 font-medium">
          {data.length} candidate{data.length !== 1 ? 's' : ''}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings2 size={14} />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Show/Hide Columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table.getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value: boolean) => column.toggleVisibility(!!value)}
                  >
                    {getColumnDisplayName(column.id)}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="text-center">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className="text-justify align-top py-2"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default DataTable;
